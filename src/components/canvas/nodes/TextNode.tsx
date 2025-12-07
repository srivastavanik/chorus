import { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Play, Loader2, Globe, Paperclip, MoreHorizontal, Maximize2, X } from 'lucide-react';
import { useCanvasStore } from '@/lib/store';
import { getAncestorContext } from '@/lib/context';

export function TextNode({ id, data }: NodeProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [model, setModel] = useState('grok-4-fast');
  
  const updateNodeContent = useCanvasStore((state) => state.updateNodeContent);
  
  const content = typeof data.label === 'string' ? data.label : '';

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    
    try {
      // Get fresh state for context
      const { nodes, edges } = useCanvasStore.getState();
      // Get context from ancestor nodes
      const context = getAncestorContext(id, nodes, edges);
      
      // Prepare messages
      const messages = [
        ...context,
        { role: 'user', content: prompt }
      ];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          model,
          webSearch,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to fetch');
      if (!response.body) return;
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        accumulated += chunk;
        updateNodeContent(id, accumulated);
      }
    } catch (e) {
      console.error(e);
      updateNodeContent(id, content + '\n\nError: Failed to generate response.');
    } finally {
      setIsLoading(false);
      setPrompt('');
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl w-[400px] flex flex-col shadow-lg transition-shadow hover:shadow-xl hover:border-gray-600 group">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-gray-900/50 rounded-t-xl backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <select 
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="bg-transparent text-xs text-gray-400 font-medium focus:outline-none cursor-pointer hover:text-white transition-colors"
          >
            <option value="grok-4-fast">grok-4-fast</option>
            <option value="grok-4">grok-4</option>
          </select>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => setWebSearch(!webSearch)}
            className={`p-1.5 rounded-md transition-colors ${webSearch ? 'text-blue-400 bg-blue-400/10' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}
            title="Web Search"
          >
            <Globe size={14} />
          </button>
          <button className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-md">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 min-h-[100px] max-h-[400px] overflow-y-auto text-sm leading-relaxed text-gray-200 prose prose-invert prose-p:my-2 prose-pre:bg-black/50 prose-pre:border prose-pre:border-gray-800">
        {content ? (
          <ReactMarkdown>{content}</ReactMarkdown>
        ) : (
          <span className="text-gray-600 italic">Ready to chat...</span>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-gray-800 bg-gray-900/50 rounded-b-xl">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
              placeholder="Ask Grok..." 
              className="pr-8 bg-black/20 border-gray-800 focus:border-gray-600"
              disabled={isLoading}
            />
            <button 
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              disabled={isLoading}
            >
              <Paperclip size={14} />
            </button>
          </div>
          <Button 
            size="icon" 
            onClick={handleSubmit}
            disabled={isLoading || !prompt.trim()}
            className={isLoading ? 'animate-pulse' : ''}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} className="ml-0.5" />}
          </Button>
        </div>
      </div>

      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-gray-600 border-2 border-gray-900" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-gray-600 border-2 border-gray-900" />
    </div>
  );
}
