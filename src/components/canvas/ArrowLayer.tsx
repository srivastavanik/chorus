"use client";

import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useCanvasStore, CanvasArrow } from "@/lib/store";

// Simplify path points using Douglas-Peucker algorithm
function simplifyPath(points: { x: number; y: number }[], tolerance: number = 2): { x: number; y: number }[] {
  if (points.length <= 2) return points;

  const sqDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return dx * dx + dy * dy;
  };

  const perpendicularDistance = (
    point: { x: number; y: number },
    lineStart: { x: number; y: number },
    lineEnd: { x: number; y: number }
  ) => {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const d = dx * dx + dy * dy;

    if (d === 0) return Math.sqrt(sqDistance(point, lineStart));

    let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / d;
    t = Math.max(0, Math.min(1, t));

    return Math.sqrt(
      sqDistance(point, {
        x: lineStart.x + t * dx,
        y: lineStart.y + t * dy,
      })
    );
  };

  let maxDistance = 0;
  let maxIndex = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], first, last);
    if (d > maxDistance) {
      maxDistance = d;
      maxIndex = i;
    }
  }

  if (maxDistance > tolerance) {
    const left = simplifyPath(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPath(points.slice(maxIndex), tolerance);
    return left.slice(0, -1).concat(right);
  }

  return [first, last];
}

// Generate smooth SVG path from points
function pointsToPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  // Use quadratic bezier curves for smooth path
  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    
    if (i === 0) {
      path += ` L ${next.x} ${next.y}`;
    } else {
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      path += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
    }
  }
  
  // Add last point
  const last = points[points.length - 1];
  const secondLast = points[points.length - 2];
  path += ` Q ${secondLast.x} ${secondLast.y} ${last.x} ${last.y}`;
  
  return path;
}

// Calculate arrowhead position and rotation
function getArrowhead(points: { x: number; y: number }[], size: number = 12) {
  if (points.length < 2) return null;
  
  const last = points[points.length - 1];
  const secondLast = points[points.length - 2];
  
  const angle = Math.atan2(last.y - secondLast.y, last.x - secondLast.x);
  
  return {
    x: last.x,
    y: last.y,
    angle: angle * (180 / Math.PI),
    size,
  };
}

interface ArrowPathProps {
  arrow: CanvasArrow;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function ArrowPath({ arrow, isSelected, onSelect }: ArrowPathProps) {
  const { flowToScreenPosition } = useReactFlow();
  
  // Convert flow coordinates to screen coordinates
  const screenPoints = arrow.points.map(p => flowToScreenPosition(p));
  const simplifiedPoints = simplifyPath(screenPoints, 3);
  const pathD = pointsToPath(simplifiedPoints);
  const arrowhead = getArrowhead(simplifiedPoints);
  
  return (
    <g onClick={(e) => { e.stopPropagation(); onSelect(arrow.id); }}>
      {/* Invisible wider path for easier selection */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: "pointer" }}
      />
      {/* Visible path */}
      <path
        d={pathD}
        fill="none"
        stroke={arrow.color}
        strokeWidth={arrow.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          filter: isSelected ? `drop-shadow(0 0 4px ${arrow.color})` : undefined,
          cursor: "pointer",
        }}
      />
      {/* Arrowhead */}
      {arrowhead && (
        <polygon
          points={`0,-${arrowhead.size / 2} ${arrowhead.size},0 0,${arrowhead.size / 2}`}
          fill={arrow.color}
          transform={`translate(${arrowhead.x}, ${arrowhead.y}) rotate(${arrowhead.angle})`}
          style={{ cursor: "pointer" }}
        />
      )}
      {/* Selection indicator */}
      {isSelected && (
        <circle
          cx={screenPoints[0]?.x || 0}
          cy={screenPoints[0]?.y || 0}
          r={6}
          fill="white"
          stroke={arrow.color}
          strokeWidth={2}
        />
      )}
    </g>
  );
}

interface ArrowLayerProps {
  currentDrawingPoints?: { x: number; y: number }[];
  drawingColor?: string;
  drawingStrokeWidth?: number;
}

export function ArrowLayer({ 
  currentDrawingPoints, 
  drawingColor = "#ef4444", 
  drawingStrokeWidth = 3 
}: ArrowLayerProps) {
  const arrows = useCanvasStore((state) => state.arrows);
  const selectedArrowId = useCanvasStore((state) => state.selectedArrowId);
  const setSelectedArrowId = useCanvasStore((state) => state.setSelectedArrowId);
  const { flowToScreenPosition } = useReactFlow();
  
  const handleSelectArrow = useCallback((id: string) => {
    setSelectedArrowId(id === selectedArrowId ? null : id);
  }, [selectedArrowId, setSelectedArrowId]);
  
  // Convert current drawing points to screen coordinates
  const screenDrawingPoints = currentDrawingPoints?.map(p => flowToScreenPosition(p)) || [];
  const drawingPath = pointsToPath(screenDrawingPoints);
  
  return (
    <svg
      className="fixed inset-0 pointer-events-none z-[500]"
      style={{ width: "100vw", height: "100vh" }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
        </marker>
      </defs>
      
      {/* Existing arrows */}
      <g style={{ pointerEvents: "auto" }}>
        {arrows.map((arrow) => (
          <ArrowPath
            key={arrow.id}
            arrow={arrow}
            isSelected={arrow.id === selectedArrowId}
            onSelect={handleSelectArrow}
          />
        ))}
      </g>
      
      {/* Current drawing preview */}
      {currentDrawingPoints && currentDrawingPoints.length > 0 && (
        <path
          d={drawingPath}
          fill="none"
          stroke={drawingColor}
          strokeWidth={drawingStrokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="5,5"
          style={{ opacity: 0.7 }}
        />
      )}
    </svg>
  );
}

export { simplifyPath };

