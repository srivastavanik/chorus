'use client';

import { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Image as ImageIcon, ChevronDown, Minus, Plus } from 'lucide-react';

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1', category: 'Square' },
  { id: '21:9', label: '21:9', category: 'Horizontal' },
  { id: '16:9', label: '16:9', category: 'Horizontal' },
  { id: '3:2', label: '3:2', category: 'Horizontal' },
  { id: '4:3', label: '4:3', category: 'Horizontal' },
  { id: '5:4', label: '5:4', category: 'Horizontal' },
  { id: '4:5', label: '4:5', category: 'Vertical' },
  { id: '3:4', label: '3:4', category: 'Vertical' },
  { id: '2:3', label: '2:3', category: 'Vertical' },
  { id: '9:16', label: '9:16', category: 'Vertical' },
];

const RESOLUTIONS = ['1K', '2K', '4K'];

export function ImageNode({ data }: NodeProps) {
  const [ratio, setRatio] = useState('1:1');
  const [resolution, setResolution] = useState('1K');
  const [prompt, setPrompt] = useState('');
  const [showRatioMenu, setShowRatioMenu] = useState(false);
  const [count, setCount] = useState(1);

  const getAspectStyle = () => {
    const [w, h] = ratio.split(':').map(Number);
    const aspectRatio = w / h;
    if (aspectRatio >= 1) {
      return { width: '100%', aspectRatio: `${w}/${h}` };
    }
    return { height: '240px', aspectRatio: `${w}/${h}` };
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl w-[380px] flex flex-col shadow-lg transition-shadow hover:shadow-xl hover:border-gray-600">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-gray-900/50 rounded-t-xl">
        <div className="flex items-center gap-2 text-gray-400">
          <ImageIcon size={14} />
          <span className="text-xs font-medium">Image</span>
        </div>
        <div className="text-xs text-gray-500">
          Nano Banana Pro
          <ChevronDown size={10} className="inline ml-1" />
        </div>
      </div>

      {/* Preview Area */}
      <div className="p-4 bg-black/40 flex items-center justify-center">
        <div 
          className="border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center text-gray-600 transition-all max-w-full"
          style={getAspectStyle()}
        >
          <ImageIcon size={32} className="mb-2 opacity-50" />
          <span className="text-xs px-4 text-center">{prompt || 'Enter prompt to generate'}</span>
        </div>
      </div>

      {/* Prompt Display */}
      {data.label && (
        <div className="px-4 py-2 border-t border-gray-800 text-xs text-gray-400 truncate">
          {String(data.label)}
        </div>
      )}

      {/* Controls */}
      <div className="p-3 border-t border-gray-800 bg-gray-900/50">
        {/* Aspect Ratio & Resolution Row */}
        <div className="flex items-center gap-2 mb-3">
          {/* Aspect Ratio Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowRatioMenu(!showRatioMenu)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-xs text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <div className="w-3 h-3 border border-gray-500 rounded-sm" />
              {ratio}
              <ChevronDown size={12} />
            </button>
            
            {showRatioMenu && (
              <div className="absolute top-full left-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 min-w-[140px] py-1 max-h-[300px] overflow-y-auto">
                {['Square', 'Horizontal', 'Vertical'].map(category => (
                  <div key={category}>
                    <div className="px-3 py-1 text-[10px] text-gray-500 uppercase tracking-wider">{category}</div>
                    {ASPECT_RATIOS.filter(r => r.category === category).map((r) => (
                      <button
                        key={r.id}
                        onClick={() => { setRatio(r.id); setShowRatioMenu(false); }}
                        className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-gray-800 transition-colors ${ratio === r.id ? 'text-white bg-gray-800' : 'text-gray-400'}`}
                      >
                        <div className="w-3 h-3 border border-gray-600 rounded-sm" />
                        {r.label}
                        {ratio === r.id && <span className="ml-auto text-blue-400">✓</span>}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resolution Selector */}
          <div className="flex items-center bg-gray-800 border border-gray-700 rounded-md">
            {RESOLUTIONS.map((res) => (
              <button
                key={res}
                onClick={() => setResolution(res)}
                className={`px-2.5 py-1.5 text-xs transition-colors ${resolution === res ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {res}
              </button>
            ))}
          </div>

          {/* Count Selector */}
          <div className="flex items-center gap-1 ml-auto">
            <button 
              onClick={() => setCount(Math.max(1, count - 1))}
              className="p-1 text-gray-500 hover:text-white hover:bg-gray-800 rounded transition-colors"
            >
              <Minus size={14} />
            </button>
            <span className="w-6 text-center text-sm text-white">{count}</span>
            <button 
              onClick={() => setCount(Math.min(4, count + 1))}
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
            placeholder="Describe the image..." 
            className="bg-black/20 border-gray-800 focus:border-gray-600 text-xs"
          />
          <Button size="icon" className="h-9 w-9">
            <span className="text-lg">↑</span>
          </Button>
        </div>
      </div>

      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-gray-600 border-2 border-gray-900 transition-all hover:!bg-white hover:scale-125" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-gray-600 border-2 border-gray-900 transition-all hover:!bg-white hover:scale-125" />
    </div>
  );
}
