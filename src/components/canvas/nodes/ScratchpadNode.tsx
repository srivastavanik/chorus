'use client';

import { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Pencil, Eraser, Trash2, Wand2, Loader2, Download, MoreHorizontal, MessageSquare, Image as ImageIcon, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCanvasStore } from '@/lib/store';
import { useClickOutside } from '@/hooks/useClickOutside';

export function ScratchpadNode({ id, data, selected }: NodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
  const [brushSize, setBrushSize] = useState(2);
  const [showGenerate, setShowGenerate] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const updateNodeType = useCanvasStore((state) => state.updateNodeType);
  const deleteNode = useCanvasStore((state) => state.deleteNode);
  const duplicateNode = useCanvasStore((state) => state.duplicateNode);

  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useClickOutside<HTMLDivElement>(() => setShowMoreMenu(false), [moreBtnRef]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
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
    ctx.lineWidth = tool === 'eraser' ? brushSize * 5 : brushSize;
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
    setGeneratedImage(null);
  };

  const getCanvasDataUrl = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  };

  const handleGenerateFromSketch = async () => {
    if (!prompt.trim()) return;
    
    const sketchDataUrl = getCanvasDataUrl();
    if (!sketchDataUrl) return;

    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: prompt,
          editImage: sketchDataUrl,
          model: 'grok-2-image',
        }),
      });

      if (!response.ok) throw new Error('Failed to generate');
      
      const result = await response.json();
      if (result.data?.[0]?.url) {
        setGeneratedImage(result.data[0].url);
      }
    } catch (err) {
      console.error('Generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    const dataUrl = generatedImage || getCanvasDataUrl();
    if (dataUrl) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `sketch-${Date.now()}.png`;
      link.click();
    }
  };

  return (
    <div className={`bg-[#0a0a0a] border rounded-xl w-[352px] flex flex-col shadow-lg ${selected ? 'border-white' : 'border-gray-800'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-[#141414] rounded-t-xl cursor-grab active:cursor-grabbing drag-handle">
        <div className="flex items-center gap-2 text-gray-400">
          <Pencil size={14} />
          <span className="text-xs font-medium">Scratchpad</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setTool('pencil')}
            className={`p-1.5 rounded-md transition-colors nodrag ${tool === 'pencil' ? 'bg-white text-black' : 'text-gray-500 hover:bg-gray-800'}`}
            title="Pencil tool"
          >
            <Pencil size={14} />
          </button>
          <button 
            onClick={() => setTool('eraser')}
            className={`p-1.5 rounded-md transition-colors nodrag ${tool === 'eraser' ? 'bg-white text-black' : 'text-gray-500 hover:bg-gray-800'}`}
            title="Eraser tool"
          >
            <Eraser size={14} />
          </button>
          <div className="w-px h-4 bg-gray-700 mx-1" />
          <button 
            onClick={() => setShowGenerate(!showGenerate)}
            className={`p-1.5 rounded-md transition-colors nodrag ${showGenerate ? 'bg-purple-600 text-white' : 'text-gray-500 hover:bg-gray-800 hover:text-purple-400'}`}
            title="Generate from sketch"
          >
            <Wand2 size={14} />
          </button>
          <button 
            onClick={handleDownload}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-md transition-colors nodrag"
            title="Download"
          >
            <Download size={14} />
          </button>
          <button 
            onClick={clearCanvas}
            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-md transition-colors nodrag"
            title="Clear canvas"
          >
            <Trash2 size={14} />
          </button>
          
          <div className="relative nodrag">
            <button 
              ref={moreBtnRef}
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-md transition-colors nodrag"
              title="More options"
            >
              <MoreHorizontal size={14} />
            </button>
            
            {showMoreMenu && (
              <div 
                ref={moreMenuRef}
                className="absolute top-full right-0 mt-1 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl z-[100] min-w-[160px] py-1 text-left"
              >
                <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-800">Actions</div>
                <button
                  onClick={() => { duplicateNode(id); setShowMoreMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Copy size={14} /> Duplicate
                </button>
                <button
                  onClick={() => { deleteNode(id); setShowMoreMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors flex items-center gap-2 border-b border-gray-800"
                >
                  <Trash2 size={14} /> Delete
                </button>
                <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-800">Convert to</div>
                <button
                  onClick={() => { updateNodeType(id, 'text'); setShowMoreMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-2"
                >
                  <MessageSquare size={14} /> Text Node
                </button>
                <button
                  onClick={() => { updateNodeType(id, 'image'); setShowMoreMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-2"
                >
                  <ImageIcon size={14} /> Image Node
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Brush size */}
      <div className="px-3 py-2 border-b border-gray-700 flex items-center gap-2 nopan nodrag">
        <span className="text-xs text-gray-500">Size:</span>
        <input 
          type="range" 
          min="1" 
          max="10" 
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-xs text-gray-400 w-4">{brushSize}</span>
      </div>

      {/* Canvas or Generated Image */}
      <div className="p-4 bg-[#0d0d0d] relative nopan nodrag">
        {generatedImage ? (
          <img 
            src={generatedImage} 
            alt="Generated" 
            className="w-[320px] h-[320px] rounded-lg object-cover"
            draggable={false}
          />
        ) : (
          <canvas
            ref={canvasRef}
            className="border border-gray-700 rounded-lg cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={() => setIsDrawing(false)}
            onMouseLeave={() => setIsDrawing(false)}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={() => setIsDrawing(false)}
            style={{ width: '320px', height: '320px' }}
          />
        )}
      </div>

      {/* Generate from sketch */}
      {showGenerate && (
        <div className="p-3 border-t border-gray-700 nopan nodrag">
          <div className="flex gap-2">
            <Input 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerateFromSketch()}
              placeholder="Describe the image..." 
              className="bg-[#252525] border-gray-600 text-xs"
              disabled={isGenerating}
            />
            <Button 
              size="icon" 
              onClick={handleGenerateFromSketch}
              disabled={isGenerating || !prompt.trim()}
              className="h-9 w-9"
            >
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            </Button>
          </div>
          <p className="text-[10px] text-gray-600 mt-1">
            Your sketch will be used as a reference for generation
          </p>
        </div>
      )}

      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-4 !h-4 !bg-gray-500 !border-2 !border-gray-800 hover:!bg-white hover:!scale-125 transition-all"
        style={{ left: -8 }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-4 !h-4 !bg-gray-500 !border-2 !border-gray-800 hover:!bg-white hover:!scale-125 transition-all"
        style={{ right: -8 }}
      />
    </div>
  );
}
