'use client';

import { Button } from '@/components/ui/Button';
import { Save, ZoomIn, ZoomOut, Share2, Plus } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/lib/store';

export function Toolbar() {
  const { zoomIn, zoomOut, getViewport, screenToFlowPosition } = useReactFlow();
  
  const addNode = useCanvasStore((state) => state.addNode);
  const saveCanvas = useCanvasStore((state) => state.saveCanvas);
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
      <div className="flex items-center gap-1 pr-2 border-r border-gray-700">
        <button 
          onClick={() => zoomOut()}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={18} />
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
          onClick={() => saveCanvas('Untitled Canvas')}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          title="Save canvas"
        >
          <Save size={18} />
        </button>
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
