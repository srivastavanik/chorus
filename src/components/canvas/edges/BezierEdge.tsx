import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from '@xyflow/react';
import { Plus } from 'lucide-react';

export function BezierEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  source,
  target,
  animated,
  selected
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? '#fff' : (style.stroke || '#404040'),
        }}
        className={animated ? 'edge-generating' : ''}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan opacity-0 hover:opacity-100 transition-opacity group"
        >
          <button
            className="w-6 h-6 bg-gray-900 border border-gray-600 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:border-white transition-colors shadow-sm hover:scale-110"
            onClick={(event) => {
              event.stopPropagation();
              console.log('Add node between', source, target);
            }}
          >
            <Plus size={12} />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
