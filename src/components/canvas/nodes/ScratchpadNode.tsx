'use client';

import { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
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
  
  // Update store dimensions on resize
  const updateNodeDimensions = useCanvasStore((state) => state.updateNodeDimensions);

  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useClickOutside<HTMLDivElement>(() => setShowMoreMenu(false), [moreBtnRef]);
  
  // Initial size from data or default
  const [size, setSize] = useState({ width: data.width || 352, height: data.height || 450 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas internal resolution to match display size
    // We need to preserve content on resize ideally, but for now simple resize clears or scales
    // To preserve: create temp canvas, copy, resize, draw back
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) tempCtx.drawImage(canvas, 0, 0);

    // Update dimensions
    // The canvas element size is controlled by CSS/container, but internal width/height needs to match
    // for correct drawing resolution.
    // However, NodeResizer controls the container size.
    // We'll let the canvas fill the container.
    
    // On init, fill white
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Only fill if empty (naive check: simple fill on mount)
    // If resizing, we might lose data if we reset width/height.
    // Let's just handle initial setup here.
    if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
        // This runs on resize if we tracked it, but for now let's rely on default
    }
  }, []);

  // Handle Resize: When node resizes, we might need to update canvas resolution?
  // Actually, standard HTML5 canvas clears on resize. 
  // A better approach for a scratchpad is a fixed resolution or scaling content.
  // For this MVP, let's keep internal resolution fixed or matching initial, 
  // and CSS scales it, OR we implement proper resize handling.
  // Let's stick to CSS scaling for simplicity unless requested otherwise, 
  // but the user said "can't expand... fix".
  
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
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
    ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : '#000000';
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
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
    <>
      <NodeResizer 
        minWidth={300}
        minHeight={300}
        isVisible={selected}
        lineClassName="border-purple-500"
        handleClassName="h-3 w-3 bg-white border-2 border-purple-500 rounded"
        onResize={(_, params) => {
            setSize({ width: params.width, height: params.height });
            updateNodeDimensions(id, params.width, params.height);
        }}
      />
      <div 
        className={`bg-white border rounded-xl flex flex-col shadow-lg overflow-hidden ${selected ? 'border-gray-400' : 'border-gray-200'}`}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 cursor-grab active:cursor-grabbing drag-handle shrink-0">
          <div className="flex items-center gap-2 text-gray-600">
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
        <div className="px-3 py-2 border-b border-gray-700 flex items-center gap-2 nopan nodrag shrink-0 bg-white">
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
        <div className="flex-1 bg-white relative nopan nodrag overflow-hidden relative">
          {generatedImage ? (
            <img 
              src={generatedImage} 
              alt="Generated" 
              className="w-full h-full object-contain"
              draggable={false}
            />
          ) : (
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair touch-none"
              // Set internal dimensions slightly larger or based on state? 
              // For now we rely on the component mount init, which might be fixed 320x320.
              // We should ideally use a ResizeObserver to update canvas.width/height
              width={1024} 
              height={1024}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={() => setIsDrawing(false)}
              onMouseLeave={() => setIsDrawing(false)}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={() => setIsDrawing(false)}
            />
          )}
        </div>

        {/* Generate from sketch */}
        {showGenerate && (
          <div className="p-3 border-t border-gray-700 nopan nodrag shrink-0 bg-white">
            <div className="flex gap-2">
              <Input 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateFromSketch()}
                placeholder="Describe the image..." 
                className="bg-[#252525] border-gray-600 text-xs text-white"
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
    </>
  );
}
