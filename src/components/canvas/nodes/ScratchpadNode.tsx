import { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Pencil, Eraser, Download, Trash2 } from 'lucide-react';

export function ScratchpadNode({ data }: NodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
  
  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set resolution match size
    canvas.width = 320;
    canvas.height = 320;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e);
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = tool === 'eraser' ? 20 : 2;
    ctx.strokeStyle = tool === 'eraser' ? '#000000' : '#FFFFFF';
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl w-[352px] flex flex-col shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-gray-900/50 rounded-t-xl">
        <div className="flex items-center gap-2 text-gray-400">
          <Pencil size={14} />
          <span className="text-xs font-medium">Scratchpad</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setTool('pencil')}
            className={`p-1.5 rounded-md transition-colors ${tool === 'pencil' ? 'bg-white text-black' : 'text-gray-500 hover:bg-gray-800'}`}
          >
            <Pencil size={14} />
          </button>
          <button 
            onClick={() => setTool('eraser')}
            className={`p-1.5 rounded-md transition-colors ${tool === 'eraser' ? 'bg-white text-black' : 'text-gray-500 hover:bg-gray-800'}`}
          >
            <Eraser size={14} />
          </button>
          <div className="w-px h-4 bg-gray-800 mx-1" />
          <button 
            onClick={clearCanvas}
            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-md transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="p-4 bg-gray-950 relative">
        <canvas
          ref={canvasRef}
          className="border border-gray-800 rounded-lg cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={() => setIsDrawing(false)}
          onMouseLeave={() => setIsDrawing(false)}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={() => setIsDrawing(false)}
          style={{ width: '320px', height: '320px' }}
        />
      </div>

      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-gray-600 border-2 border-gray-900" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-gray-600 border-2 border-gray-900" />
    </div>
  );
}
