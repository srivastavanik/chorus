import { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Image as ImageIcon, Maximize2, Settings2, Download, X } from 'lucide-react';

export function ImageNode({ data }: NodeProps) {
  const [ratio, setRatio] = useState('1:1');
  const [resolution, setResolution] = useState('1K');
  const [prompt, setPrompt] = useState('');

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl w-[320px] flex flex-col shadow-lg transition-shadow hover:shadow-xl hover:border-gray-600">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-gray-900/50 rounded-t-xl">
        <div className="flex items-center gap-2 text-gray-400">
          <ImageIcon size={14} />
          <span className="text-xs font-medium">Image Gen</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex bg-black/50 rounded-md p-0.5 border border-gray-800">
            <button 
              onClick={() => setRatio('1:1')}
              className={`text-[10px] px-1.5 py-0.5 rounded ${ratio === '1:1' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >1:1</button>
            <button 
              onClick={() => setRatio('16:9')}
              className={`text-[10px] px-1.5 py-0.5 rounded ${ratio === '16:9' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >16:9</button>
          </div>
          <div className="flex bg-black/50 rounded-md p-0.5 border border-gray-800 ml-1">
            <button 
              onClick={() => setResolution('1K')}
              className={`text-[10px] px-1.5 py-0.5 rounded ${resolution === '1K' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >1K</button>
            <button 
              onClick={() => setResolution('2K')}
              className={`text-[10px] px-1.5 py-0.5 rounded ${resolution === '2K' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >2K</button>
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className="p-4 bg-black/40 min-h-[280px] flex items-center justify-center relative group/image">
        <div className={`border-2 border-dashed border-gray-800 rounded-lg flex flex-col items-center justify-center text-gray-600 transition-all ${ratio === '1:1' ? 'w-64 h-64' : 'w-64 h-36'}`}>
          <ImageIcon size={32} className="mb-2 opacity-50" />
          <span className="text-xs">Enter prompt to generate</span>
        </div>
        {/* Overlay Actions */}
        <div className="absolute top-2 right-2 opacity-0 group-hover/image:opacity-100 transition-opacity flex gap-1">
           <button className="p-1.5 bg-black/60 text-white rounded-md hover:bg-black/80 backdrop-blur-sm">
             <Maximize2 size={14} />
           </button>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-gray-800 bg-gray-900/50 rounded-b-xl">
        <div className="flex gap-2">
          <Input 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe image..." 
            className="bg-black/20 border-gray-800 focus:border-gray-600 text-xs"
          />
          <Button size="sm" className="px-3 h-9">
            Generate
          </Button>
        </div>
      </div>

      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-gray-600 border-2 border-gray-900" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-gray-600 border-2 border-gray-900" />
    </div>
  );
}
