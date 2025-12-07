'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { ZoomIn, ZoomOut, Share2, Plus, Clock, Pen, X } from 'lucide-react';
import { useReactFlow, useViewport } from '@xyflow/react';
import { useCanvasStore } from '@/lib/store';
import { useClickOutside } from '@/hooks/useClickOutside';
import { ShareModal } from './ShareModal';
import { VersionHistoryPanel } from './VersionHistoryPanel';

const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.5, 2];

const ARROW_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#000000', // black
];

export function Toolbar() {
  const { zoomIn, zoomOut, zoomTo, screenToFlowPosition } = useReactFlow();
  const { zoom } = useViewport();
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isArrowColorPickerOpen, setIsArrowColorPickerOpen] = useState(false);
  
  const zoomMenuRef = useClickOutside<HTMLDivElement>(() => setIsZoomMenuOpen(false));
  const arrowColorBtnRef = useRef<HTMLButtonElement>(null);
  const arrowColorMenuRef = useClickOutside<HTMLDivElement>(
    () => setIsArrowColorPickerOpen(false),
    [arrowColorBtnRef as React.RefObject<HTMLElement>]
  );
  
  const addNode = useCanvasStore((state) => state.addNode);
  const setSelectedNodeId = useCanvasStore((state) => state.setSelectedNodeId);
  const canvasId = useCanvasStore((state) => state.canvasId);
  
  // Arrow drawing state
  const isDrawingArrow = useCanvasStore((state) => state.isDrawingArrow);
  const setIsDrawingArrow = useCanvasStore((state) => state.setIsDrawingArrow);
  const arrowColor = useCanvasStore((state) => state.arrowColor);
  const setArrowColor = useCanvasStore((state) => state.setArrowColor);

  const handleAddNode = () => {
    // Add node in center of current viewport
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const position = screenToFlowPosition({ x: centerX, y: centerY });
    const nodeId = addNode('text', position);
    setSelectedNodeId(nodeId);
  };

  return (
    <>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#0a0a0a]/90 border border-white/10 p-1.5 rounded-full shadow-2xl backdrop-blur-xl z-50">
        <div className="relative flex items-center gap-1 pr-2 border-r border-white/10">
          {isZoomMenuOpen && (
            <div 
              ref={zoomMenuRef}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-24 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1 backdrop-blur-md"
            >
              {ZOOM_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    zoomTo(preset, { duration: 300 });
                    setIsZoomMenuOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-xs font-mono text-left hover:bg-white/5 transition-colors ${
                    Math.round(zoom * 100) === Math.round(preset * 100) ? 'text-white bg-white/5' : 'text-gray-500'
                  }`}
                >
                  {Math.round(preset * 100)}%
                </button>
              ))}
            </div>
          )}

          <button 
            onClick={() => zoomOut()}
            className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-colors"
            title="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <button
            onClick={() => setIsZoomMenuOpen(!isZoomMenuOpen)}
            className="text-[10px] font-mono text-gray-400 min-w-[3rem] text-center select-none hover:text-white transition-colors py-1 rounded hover:bg-white/5"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button 
            onClick={() => zoomIn()}
            className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-colors"
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
        </div>
        
        {/* Arrow drawing toggle */}
        <div className="relative flex items-center gap-1 pr-2 border-r border-white/10">
          <button
            onClick={() => setIsDrawingArrow(!isDrawingArrow)}
            className={`p-2 rounded-full transition-colors ${
              isDrawingArrow 
                ? 'bg-white text-black' 
                : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
            title={isDrawingArrow ? "Stop drawing arrows" : "Draw arrows"}
          >
            {isDrawingArrow ? <X size={16} /> : <Pen size={16} />}
          </button>
          
          {isDrawingArrow && (
            <div className="relative">
              <button
                ref={arrowColorBtnRef}
                onClick={() => setIsArrowColorPickerOpen(!isArrowColorPickerOpen)}
                className="w-6 h-6 rounded-full border-2 border-white/30 hover:border-white transition-colors"
                style={{ backgroundColor: arrowColor }}
                title="Arrow color"
              />
              
              {isArrowColorPickerOpen && (
                <div
                  ref={arrowColorMenuRef}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#0a0a0a] border border-white/10 rounded-lg shadow-2xl p-2 backdrop-blur-md"
                >
                  <div className="grid grid-cols-4 gap-1.5">
                    {ARROW_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          setArrowColor(color);
                          setIsArrowColorPickerOpen(false);
                        }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                          arrowColor === color ? 'border-white' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <Button 
          variant="primary" 
          size="sm" 
          className="gap-2 px-4 whitespace-nowrap rounded-full bg-white text-black hover:bg-gray-200 border-none font-mono uppercase text-[10px] tracking-wider h-8"
          onClick={handleAddNode}
          title="Add a new text node"
        >
          <Plus size={14} />
          Add Node
        </Button>
        
        <div className="flex items-center gap-1 pl-2 border-l border-white/10">
          <button 
            onClick={() => setIsHistoryOpen(true)}
            disabled={!canvasId}
            className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Version history"
          >
            <Clock size={16} />
          </button>
          <button 
            onClick={() => setIsShareModalOpen(true)}
            disabled={!canvasId}
            className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Share canvas"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>

      {canvasId && (
        <>
          <ShareModal
            canvasId={canvasId}
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
          />
          <VersionHistoryPanel
            canvasId={canvasId}
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
          />
        </>
      )}
    </>
  );
}
