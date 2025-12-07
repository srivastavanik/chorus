'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ZoomIn, ZoomOut, Share2, Plus } from 'lucide-react';
import { useReactFlow, useViewport } from '@xyflow/react';
import { useCanvasStore } from '@/lib/store';
import { useClickOutside } from '@/hooks/useClickOutside';

const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.5, 2];

export function Toolbar() {
  const { zoomIn, zoomOut, zoomTo, screenToFlowPosition } = useReactFlow();
  const { zoom } = useViewport();
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
  
  const zoomMenuRef = useClickOutside<HTMLDivElement>(() => setIsZoomMenuOpen(false));
  
  const addNode = useCanvasStore((state) => state.addNode);
  const setSelectedNodeId = useCanvasStore((state) => state.setSelectedNodeId);

  const handleAddNode = () => {
    // Add node in center of current viewport
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const position = screenToFlowPosition({ x: centerX, y: centerY });
    const nodeId = addNode('text', position);
    setSelectedNodeId(nodeId);
  };

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-gray-900/95 border border-gray-700 p-2 rounded-xl shadow-2xl backdrop-blur-sm z-50">
      <div className="relative flex items-center gap-1 pr-2 border-r border-gray-700">
        {isZoomMenuOpen && (
          <div 
            ref={zoomMenuRef}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-24 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden py-1"
          >
            {ZOOM_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  zoomTo(preset, { duration: 300 });
                  setIsZoomMenuOpen(false);
                }}
                className={`w-full px-3 py-1.5 text-sm text-left hover:bg-gray-800 transition-colors ${
                  Math.round(zoom * 100) === Math.round(preset * 100) ? 'text-white bg-gray-800' : 'text-gray-400'
                }`}
              >
                {Math.round(preset * 100)}%
              </button>
            ))}
          </div>
        )}

        <button 
          onClick={() => zoomOut()}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={() => setIsZoomMenuOpen(!isZoomMenuOpen)}
          className="text-xs text-gray-400 min-w-[3rem] text-center select-none font-medium hover:text-white transition-colors py-1 rounded hover:bg-gray-800"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button 
          onClick={() => zoomIn()}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          title="Zoom in"
        >
          <ZoomIn size={18} />
        </button>
      </div>
      
      <Button 
        variant="primary" 
        size="sm" 
        className="gap-2 px-4 whitespace-nowrap"
        onClick={handleAddNode}
        title="Add a new text node"
      >
        <Plus size={16} />
        Add Node
      </Button>
      
      <div className="flex items-center gap-1 pl-2 border-l border-gray-700">
        <button 
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          title="Share canvas"
        >
          <Share2 size={18} />
        </button>
      </div>
    </div>
  );
}
