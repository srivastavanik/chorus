import { Button } from '@/components/ui/Button';
import { Save, ZoomIn, ZoomOut, Share2, Plus } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/lib/store';

export function Toolbar() {
  const { zoomIn, zoomOut } = useReactFlow();
  const addNode = useCanvasStore((state) => state.addNode);
  const saveCanvas = useCanvasStore((state) => state.saveCanvas);

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-gray-900/90 border border-gray-700 p-2 rounded-xl shadow-2xl backdrop-blur-sm z-50">
      <div className="flex items-center gap-1 pr-2 border-r border-gray-700">
        <Button variant="ghost" size="icon" onClick={() => zoomOut()}>
          <ZoomOut size={18} />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => zoomIn()}>
          <ZoomIn size={18} />
        </Button>
      </div>
      
      <Button 
        variant="primary" 
        size="sm" 
        className="gap-2"
        onClick={() => addNode('text', { x: 100 + Math.random() * 50, y: 100 + Math.random() * 50 })}
      >
        <Plus size={16} />
        Add Node
      </Button>
      
      <div className="flex items-center gap-1 pl-2 border-l border-gray-700">
        <Button variant="ghost" size="icon" onClick={() => saveCanvas('Untitled Canvas')}>
          <Save size={18} />
        </Button>
        <Button variant="ghost" size="icon">
          <Share2 size={18} />
        </Button>
      </div>
    </div>
  );
}

