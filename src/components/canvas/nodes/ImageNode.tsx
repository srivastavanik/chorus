'use client';

import { useState, useRef } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Image as ImageIcon, ChevronDown, Minus, Plus, Loader2, 
  RefreshCw, Download, Maximize2, ThumbsUp, ThumbsDown,
  Upload, Wand2, MoreHorizontal, MessageSquare, Pencil, Trash2, Copy
} from 'lucide-react';
import { useCanvasStore } from '@/lib/store';
import { useClickOutside } from '@/hooks/useClickOutside';

const MODELS = [
  { id: 'grok-2-image', name: 'Grok 2 Image', description: 'Latest model' },
  { id: 'grok-2-image-1212', name: 'Grok 2 Image 1212', description: 'December 2024' },
];

const QUALITY_OPTIONS = [
  { id: 'low', name: 'Low', description: 'Fast, smaller files' },
  { id: 'medium', name: 'Medium', description: 'Balanced (default)' },
  { id: 'high', name: 'High', description: 'Highest quality' },
];

export function ImageNode({ id, data, selected }: NodeProps) {
  const [model, setModel] = useState('grok-2-image');
  const [quality, setQuality] = useState('medium');
  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<Array<{ url: string; revisedPrompt?: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [mode, setMode] = useState<'generate' | 'edit'>('generate');
  const [editImage, setEditImage] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateNodeType = useCanvasStore((state) => state.updateNodeType);
  const deleteNode = useCanvasStore((state) => state.deleteNode);
  const duplicateNode = useCanvasStore((state) => state.duplicateNode);

  const modelBtnRef = useRef<HTMLButtonElement>(null);
  const qualityBtnRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  const modelMenuRef = useClickOutside<HTMLDivElement>(() => setShowModelMenu(false), [modelBtnRef]);
  const qualityMenuRef = useClickOutside<HTMLDivElement>(() => setShowQualityMenu(false), [qualityBtnRef]);
  const moreMenuRef = useClickOutside<HTMLDivElement>(() => setShowMoreMenu(false), [moreBtnRef]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (mode === 'edit' && !editImage) {
      setError('Please upload an image to edit');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const body = { 
        prompt, 
        model, 
        n: count,
        quality: mode === 'generate' ? quality : undefined,
        editImage: mode === 'edit' ? editImage : undefined 
      };

      const response = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const result = await response.json();
      if (result.data) {
        setImages(result.data.map((img: any) => ({
          url: img.url,
          revisedPrompt: img.revised_prompt,
        })));
        setSelectedImageIndex(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const handleDownload = async () => {
    if (images[selectedImageIndex]) {
      const link = document.createElement('a');
      link.href = images[selectedImageIndex].url;
      link.download = `grok-image-${Date.now()}.png`;
      link.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`bg-[#0a0a0a] border rounded-xl w-[400px] flex flex-col shadow-lg ${selected ? 'border-white' : 'border-gray-800'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-[#141414] rounded-t-xl cursor-grab active:cursor-grabbing drag-handle">
        <div className="flex items-center gap-2 text-gray-400">
          <ImageIcon size={14} />
          <span className="text-xs font-medium">Image Generation</span>
        </div>
        
        <div className="flex items-center gap-2">
           <div className="flex bg-gray-800 rounded-lg p-0.5 nodrag">
            <button
              onClick={() => setMode('generate')}
              className={`px-2 py-0.5 text-[10px] rounded-md transition-colors ${mode === 'generate' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Generate
            </button>
            <button
              onClick={() => setMode('edit')}
              className={`px-2 py-0.5 text-[10px] rounded-md transition-colors ${mode === 'edit' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Edit
            </button>
          </div>

          {/* Model selector */}
          <div className="relative">
            <button 
              ref={modelBtnRef}
              onClick={() => setShowModelMenu(!showModelMenu)}
              className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors nodrag"
            >
              {MODELS.find(m => m.id === model)?.name || model}
              <ChevronDown size={10} />
            </button>
            
            {showModelMenu && (
              <div 
                ref={modelMenuRef}
                className="absolute top-full right-0 mt-1 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl z-50 min-w-[180px] py-1"
              >
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setModel(m.id); setShowModelMenu(false); }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-800 transition-colors ${model === m.id ? 'bg-gray-800' : ''}`}
                  >
                    <div className="text-sm text-white">{m.name}</div>
                    <div className="text-xs text-gray-500">{m.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

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
                  onClick={() => { updateNodeType(id, 'scratchpad'); setShowMoreMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Pencil size={14} /> Scratchpad
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className="p-4 bg-black/40 flex items-center justify-center min-h-[200px]">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <Loader2 size={32} className="animate-spin" />
            <span className="text-xs">Generating...</span>
          </div>
        ) : images.length > 0 ? (
          <div className="relative w-full">
            <img 
              src={images[selectedImageIndex].url} 
              alt="Generated" 
              className="w-full rounded-lg"
              draggable={false}
            />
            {images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImageIndex(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${i === selectedImageIndex ? 'bg-white' : 'bg-gray-600'}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : mode === 'edit' && editImage ? (
           <div className="relative w-full">
            <img 
              src={editImage} 
              alt="Edit Preview" 
              className="w-full rounded-lg opacity-80"
              draggable={false}
            />
             <button 
              onClick={() => setEditImage(null)}
              className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
            >
              <Minus size={12} />
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 flex flex-col items-center justify-center text-gray-600 w-full aspect-square max-h-[240px]">
             {mode === 'edit' ? (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2 hover:text-white transition-colors"
              >
                <Upload size={32} className="opacity-50" />
                <span className="text-xs text-center">Upload image to edit</span>
              </button>
            ) : (
              <>
                <ImageIcon size={32} className="mb-2 opacity-50" />
                <span className="text-xs text-center">{prompt || 'Enter prompt to generate'}</span>
              </>
            )}
          </div>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>

      {/* Revised Prompt */}
      {images[selectedImageIndex]?.revisedPrompt && (
        <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-500 max-h-16 overflow-y-auto">
          <span className="text-gray-600">Revised: </span>
          {images[selectedImageIndex].revisedPrompt}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-2 border-t border-gray-700 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Image Actions */}
      {images.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-700 flex items-center gap-2 nopan nodrag">
          <button 
            onClick={handleRegenerate}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded transition-colors"
            title="Regenerate"
          >
            <RefreshCw size={14} />
          </button>
          <button 
            onClick={handleDownload}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded transition-colors"
            title="Download"
          >
            <Download size={14} />
          </button>
          <div className="flex-1" />
          <button 
            className="p-1.5 text-gray-500 hover:text-green-400 hover:bg-gray-800 rounded transition-colors"
            title="Like"
          >
            <ThumbsUp size={14} />
          </button>
          <button 
            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded transition-colors"
            title="Dislike"
          >
            <ThumbsDown size={14} />
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="p-3 border-t border-gray-700 bg-[#1a1a1a] nopan nodrag">
        {/* Quality & Count Row */}
        <div className="flex items-center gap-2 mb-3">
          {/* Quality Dropdown */}
          <div className="relative">
            <button 
              ref={qualityBtnRef}
              onClick={() => setShowQualityMenu(!showQualityMenu)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#252525] border border-gray-700 rounded-md text-xs text-gray-300 hover:bg-gray-700 transition-colors"
            >
              {QUALITY_OPTIONS.find(q => q.id === quality)?.name || quality}
              <ChevronDown size={12} />
            </button>
            
            {showQualityMenu && (
              <div 
                ref={qualityMenuRef}
                className="absolute top-full left-0 mt-1 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl z-50 min-w-[150px] py-1"
              >
                {QUALITY_OPTIONS.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => { setQuality(q.id); setShowQualityMenu(false); }}
                    className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-800 transition-colors ${quality === q.id ? 'text-white bg-gray-800' : 'text-gray-400'}`}
                  >
                    {q.name}
                    <span className="text-xs text-gray-600 ml-2">{q.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Count Selector */}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-xs text-gray-500 mr-1">Count:</span>
            <button 
              onClick={() => setCount(Math.max(1, count - 1))}
              className="p-1 text-gray-500 hover:text-white hover:bg-gray-800 rounded transition-colors"
            >
              <Minus size={14} />
            </button>
            <span className="w-6 text-center text-sm text-white">{count}</span>
            <button 
              onClick={() => setCount(Math.min(10, count + 1))}
              className="p-1 text-gray-500 hover:text-white hover:bg-gray-800 rounded transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Prompt Input */}
        <div className="flex gap-2">
          <Input 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            placeholder="Describe the image..." 
            className="bg-[#252525] border-gray-600 focus:border-gray-500 text-xs"
            disabled={isLoading}
          />
          <Button 
            size="icon" 
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="h-9 w-9"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <span className="text-lg">↑</span>}
          </Button>
        </div>
      </div>

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
