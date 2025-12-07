'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { 
  Save, ZoomIn, ZoomOut, Share2, Plus, Sparkles,
  Layers, Copy, Trash2, Download, Heart, Image, Video, Users
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/lib/store';

export function Toolbar() {
  const { zoomIn, zoomOut } = useReactFlow();
  const [workflowPrompt, setWorkflowPrompt] = useState('');
  
  const addNode = useCanvasStore((state) => state.addNode);
  const saveCanvas = useCanvasStore((state) => state.saveCanvas);

  const handleAddNode = () => {
    addNode('text', { x: Math.random() * 500 + 100, y: Math.random() * 500 + 100 });
  };

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-50">
      {/* Secondary Actions */}
      <div className="flex items-center gap-1 bg-gray-900/90 border border-gray-700 p-1.5 rounded-xl shadow-2xl backdrop-blur-sm">
        <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Group">
          <Layers size={16} />
        </button>
        <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Duplicate">
          <Copy size={16} />
        </button>
        <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Arrange">
          <Layers size={16} />
        </button>
        <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Delete">
          <Trash2 size={16} />
        </button>
        
        <div className="w-px h-5 bg-gray-700 mx-1" />
        
        <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Download">
          <Download size={16} />
        </button>
        <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Favorite">
          <Heart size={16} />
        </button>
        <button className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-colors" title="Run">
          <span className="text-lg">▶</span>
        </button>
      </div>
      
      {/* Main Toolbar */}
      <div className="flex items-center gap-2 bg-gray-900/90 border border-gray-700 p-2 rounded-2xl shadow-2xl backdrop-blur-sm">
        <div className="flex items-center gap-1 pr-2 border-r border-gray-700">
          <button 
            onClick={() => zoomOut()}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ZoomOut size={18} />
          </button>
          <button 
            onClick={() => zoomIn()}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ZoomIn size={18} />
          </button>
        </div>
        
        {/* Workflow Input */}
        <div className="flex items-center gap-2 bg-black/30 rounded-xl px-3 py-1.5 border border-gray-800 mx-2">
          <Sparkles size={16} className="text-orange-400" />
          <input
            type="text"
            value={workflowPrompt}
            onChange={(e) => setWorkflowPrompt(e.target.value)}
            placeholder="Describe the workflow"
            className="bg-transparent border-none outline-none text-sm text-gray-300 placeholder:text-gray-600 w-48"
          />
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-1 px-2 border-l border-gray-700">
          <button className="p-2 text-orange-400 hover:bg-orange-400/10 rounded-lg transition-colors" title="Text">
            <span className="text-sm font-medium">≡</span>
          </button>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Image">
            <Image size={16} />
          </button>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Video">
            <Video size={16} />
          </button>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Agents">
            <Users size={16} />
          </button>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="More">
            <span className="text-lg">···</span>
          </button>
        </div>
        
        <div className="w-px h-6 bg-gray-700" />
        
        <Button 
          variant="primary" 
          size="sm" 
          className="gap-2 px-4"
          onClick={handleAddNode}
        >
          <Plus size={16} />
          Add Node
        </Button>
        
        <div className="flex items-center gap-1 pl-2 border-l border-gray-700">
          <button 
            onClick={() => saveCanvas('Untitled Canvas')}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Save size={18} />
          </button>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            <Share2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

