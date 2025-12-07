'use client';

import { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Play, Loader2, Globe, Paperclip, MoreHorizontal, ChevronDown, ChevronUp, 
  Sparkles, Search, Edit3, GitBranch, Check, X, User, Bot, RotateCcw
} from 'lucide-react';
import { useCanvasStore, ChatMessage } from '@/lib/store';
import { getAncestorContext } from '@/lib/context';

interface StreamEvent {
  type: 'content' | 'reasoning' | 'status' | 'done';
  content?: string;
  reasoning_tokens?: number;
  status?: string;
  message?: string;
  citations?: string[];
}

const MODELS = [
  { id: 'grok-4-fast', name: 'Grok 4 Fast', description: 'Optimized for speed' },
  { id: 'grok-4', name: 'Grok 4', description: 'Full reasoning' },
  { id: 'grok-4-fast-non-reasoning', name: 'Grok 4 Fast (No Reasoning)', description: 'Fastest responses' },
  { id: 'grok-3', name: 'Grok 3', description: 'Previous generation' },
  { id: 'grok-3-mini', name: 'Grok 3 Mini', description: 'Lightweight' },
];

export function TextNode({ id, data }: NodeProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [model, setModel] = useState('grok-4-fast');
  const [reasoning, setReasoning] = useState('');
  const [showReasoning, setShowReasoning] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [citations, setCitations] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showSplitMenu, setShowSplitMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const addMessageToNode = useCanvasStore((state) => state.addMessageToNode);
  const updateMessageInNode = useCanvasStore((state) => state.updateMessageInNode);
  const splitNode = useCanvasStore((state) => state.splitNode);
  
  const messages: ChatMessage[] = data.messages || [];
  const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();

  useEffect(() => {
    if (contentRef.current && isLoading) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = async (overridePrompt?: string) => {
    const submitPrompt = overridePrompt || prompt;
    if (!submitPrompt.trim()) return;
    
    setIsLoading(true);
    setReasoning('');
    setStatus(null);
    setCitations([]);
    
    // Add user message
    addMessageToNode(id, { role: 'user', content: submitPrompt });
    
    try {
      const { nodes, edges } = useCanvasStore.getState();
      const context = getAncestorContext(id, nodes, edges);
      
      // Build messages from node history
      const nodeMessages = messages.map(m => ({ role: m.role, content: m.content }));
      const allMessages = [...context, ...nodeMessages, { role: 'user', content: submitPrompt }];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages, model, webSearch }),
      });
      
      if (!response.ok) throw new Error('Failed to fetch');
      if (!response.body) return;
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let accumulatedReasoning = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const lines = text.split('\n').filter(Boolean);
        
        for (const line of lines) {
          try {
            const event: StreamEvent = JSON.parse(line);
            
            if (event.type === 'content' && event.content) {
              accumulated += event.content;
              // Update the last assistant message or add new one
              const currentMessages = useCanvasStore.getState().nodes.find(n => n.id === id)?.data.messages || [];
              const lastMsg = currentMessages[currentMessages.length - 1];
              if (lastMsg?.role === 'assistant') {
                updateMessageInNode(id, currentMessages.length - 1, accumulated);
              } else {
                addMessageToNode(id, { role: 'assistant', content: accumulated });
              }
            } else if (event.type === 'reasoning' && event.content) {
              accumulatedReasoning += event.content;
              setReasoning(accumulatedReasoning);
            } else if (event.type === 'status') {
              setStatus(event.message || null);
            } else if (event.type === 'done') {
              if (event.citations) setCitations(event.citations);
            }
          } catch (e) {
            accumulated += line;
            const currentMessages = useCanvasStore.getState().nodes.find(n => n.id === id)?.data.messages || [];
            const lastMsg = currentMessages[currentMessages.length - 1];
            if (lastMsg?.role === 'assistant') {
              updateMessageInNode(id, currentMessages.length - 1, accumulated);
            } else {
              addMessageToNode(id, { role: 'assistant', content: accumulated });
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
      addMessageToNode(id, { role: 'assistant', content: 'Error: Failed to generate response.' });
    } finally {
      setIsLoading(false);
      setStatus(null);
      setPrompt('');
    }
  };

  const handleEditMessage = (index: number) => {
    setEditingIndex(index);
    setEditContent(messages[index].content);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null) {
      updateMessageInNode(id, editingIndex, editContent);
      setEditingIndex(null);
      setEditContent('');
    }
  };

  const handleRegenerateFrom = (index: number) => {
    const userMessage = messages[index];
    if (userMessage.role === 'user') {
      // Remove messages after this point and regenerate
      updateMessageInNode(id, index, userMessage.content);
      handleSubmit(userMessage.content);
    }
  };

  const handleSplit = (count: number) => {
    splitNode(id, count);
    setShowSplitMenu(false);
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl w-[450px] flex flex-col shadow-lg transition-all duration-200 hover:shadow-xl hover:border-gray-600 group">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-gray-900/50 rounded-t-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 relative">
          <button 
            onClick={() => setShowModelMenu(!showModelMenu)}
            className="flex items-center gap-1 text-xs text-gray-400 font-medium hover:text-white transition-colors"
          >
            {MODELS.find(m => m.id === model)?.name || model}
            <ChevronDown size={12} />
          </button>
          
          {showModelMenu && (
            <div className="absolute top-full left-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 min-w-[200px] py-1">
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
        
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setWebSearch(!webSearch)}
            className={`p-1.5 rounded-md transition-all duration-200 ${webSearch ? 'text-blue-400 bg-blue-400/10' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}
            title="Web Search"
          >
            <Globe size={14} />
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowSplitMenu(!showSplitMenu)}
              className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
              title="Branch/Split"
            >
              <GitBranch size={14} />
            </button>
            
            {showSplitMenu && (
              <div className="absolute top-full right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 min-w-[140px] py-1">
                <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-800">Split into...</div>
                {[2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleSplit(n)}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                  >
                    {n} branches
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <button className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-md transition-colors">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Status Indicator */}
      {(isLoading || status) && (
        <div className="px-4 py-2 border-b border-gray-800 bg-gray-950/50 flex items-center gap-2">
          {status ? (
            <>
              <Search size={12} className="text-blue-400 animate-bounce" />
              <span className="text-xs text-blue-400">{status}</span>
            </>
          ) : (
            <>
              <Sparkles size={12} className="text-purple-400 animate-spin" />
              <span className="text-xs text-purple-400">Thinking...</span>
            </>
          )}
        </div>
      )}

      {/* Reasoning Section */}
      {reasoning && (
        <div className="border-b border-gray-800 bg-gray-950/30">
          <button 
            onClick={() => setShowReasoning(!showReasoning)}
            className="w-full px-4 py-2 flex items-center justify-between text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-purple-400" />
              Reasoning
            </span>
            {showReasoning ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showReasoning && (
            <div className="px-4 pb-3 text-xs text-gray-500 leading-relaxed max-h-32 overflow-y-auto">
              {reasoning}
            </div>
          )}
        </div>
      )}

      {/* Chat History */}
      <div 
        ref={contentRef}
        className="flex-1 min-h-[120px] max-h-[400px] overflow-y-auto"
      >
        {messages.length === 0 ? (
          <div className="p-4 text-gray-600 italic text-sm">Ready to chat...</div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`p-3 ${msg.role === 'user' ? 'bg-gray-950/30' : 'bg-transparent'} group/msg`}
              >
                <div className="flex items-start gap-2">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {editingIndex === index ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm text-white resize-none"
                          rows={3}
                        />
                        <div className="flex gap-1">
                          <button onClick={handleSaveEdit} className="p-1 text-green-400 hover:bg-green-400/10 rounded">
                            <Check size={14} />
                          </button>
                          <button onClick={() => setEditingIndex(null)} className="p-1 text-red-400 hover:bg-red-400/10 rounded">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm leading-relaxed text-gray-200 prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                        
                        {/* Message Actions */}
                        <div className="flex items-center gap-1 mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEditMessage(index)}
                            className="p-1 text-gray-500 hover:text-white hover:bg-gray-800 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit3 size={12} />
                          </button>
                          {msg.role === 'user' && (
                            <button 
                              onClick={() => handleRegenerateFrom(index)}
                              className="p-1 text-gray-500 hover:text-white hover:bg-gray-800 rounded transition-colors"
                              title="Regenerate from here"
                            >
                              <RotateCcw size={12} />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Loading dots */}
        {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
          <div className="p-3 flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center bg-purple-500/20 text-purple-400">
              <Bot size={12} />
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Citations */}
      {citations.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-800 flex flex-wrap gap-1">
          {citations.slice(0, 3).map((url, i) => (
            <a 
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-blue-400 hover:text-blue-300 bg-blue-400/10 px-2 py-0.5 rounded-full truncate max-w-[120px] transition-colors"
            >
              {new URL(url).hostname}
            </a>
          ))}
          {citations.length > 3 && (
            <span className="text-[10px] text-gray-500">+{citations.length - 3} more</span>
          )}
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 border-t border-gray-800 bg-gray-900/50 rounded-b-xl">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
              placeholder="Continue the conversation..." 
              className="pr-8 bg-black/20 border-gray-800 focus:border-gray-600 transition-colors"
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
            onClick={() => handleSubmit()}
            disabled={isLoading || !prompt.trim()}
            className={`transition-all duration-200 ${isLoading ? 'animate-pulse scale-95' : 'hover:scale-105'}`}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} className="ml-0.5" />}
          </Button>
        </div>
      </div>

      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-gray-600 border-2 border-gray-900 transition-all hover:!bg-white hover:scale-125" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-gray-600 border-2 border-gray-900 transition-all hover:!bg-white hover:scale-125" />
    </div>
  );
}
