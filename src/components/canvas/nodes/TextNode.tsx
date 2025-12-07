'use client';

import { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Play, Loader2, Globe, MoreHorizontal, ChevronDown, ChevronUp, 
  Edit3, GitBranch, Check, X, RotateCcw, Sparkles, ThumbsUp, ThumbsDown,
  RefreshCw, Copy, Image as ImageIcon, Pencil, Trash2, Duplicate
} from 'lucide-react';
import { useCanvasStore, ChatMessage } from '@/lib/store';
import { getAncestorContext } from '@/lib/context';
import { useClickOutside } from '@/hooks/useClickOutside';

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

// Extract numbered/bulleted items from text
function extractListItems(text: string): string[] {
  const lines = text.split('\n');
  const items: string[] = [];
  
  for (const line of lines) {
    // Match numbered lists: "1.", "1)", "1:"
    const numberedMatch = line.match(/^\s*(\d+)[\.\)\:]\s*(.+)/);
    // Match bulleted lists: "-", "*", "•"
    const bulletMatch = line.match(/^\s*[\-\*\•]\s*(.+)/);
    
    if (numberedMatch && numberedMatch[2].trim()) {
      items.push(numberedMatch[2].trim());
    } else if (bulletMatch && bulletMatch[1].trim()) {
      items.push(bulletMatch[1].trim());
    }
  }
  
  return items;
}

export function TextNode({ id, data, selected }: NodeProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [model, setModel] = useState('grok-4-fast');
  const [reasoning, setReasoning] = useState('');
  const [showReasoning, setShowReasoning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [citations, setCitations] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showSplitMenu, setShowSplitMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [detectedItems, setDetectedItems] = useState<string[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const updateNodeType = useCanvasStore((state) => state.updateNodeType);
  const addMessageToNode = useCanvasStore((state) => state.addMessageToNode);
  const updateMessageInNode = useCanvasStore((state) => state.updateMessageInNode);
  const splitNodeWithContent = useCanvasStore((state) => state.splitNodeWithContent);
  const splitNode = useCanvasStore((state) => state.splitNode);
  const rateMessage = useCanvasStore((state) => state.rateMessage);
  const reimagineNode = useCanvasStore((state) => state.reimagineNode);
  const deleteNode = useCanvasStore((state) => state.deleteNode);
  const duplicateNode = useCanvasStore((state) => state.duplicateNode);
  
  const messages: ChatMessage[] = data.messages || [];

  const modelBtnRef = useRef<HTMLButtonElement>(null);
  const splitBtnRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  const modelMenuRef = useClickOutside<HTMLDivElement>(() => setShowModelMenu(false), [modelBtnRef]);
  const splitMenuRef = useClickOutside<HTMLDivElement>(() => setShowSplitMenu(false), [splitBtnRef]);
  const moreMenuRef = useClickOutside<HTMLDivElement>(() => setShowMoreMenu(false), [moreBtnRef]);

  // Detect list items in the last assistant message
  useEffect(() => {
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistantMsg) {
      const items = extractListItems(lastAssistantMsg.content);
      setDetectedItems(items);
    } else {
      setDetectedItems([]);
    }
  }, [messages]);

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
    
    addMessageToNode(id, { role: 'user', content: submitPrompt });
    
    try {
      const { nodes, edges } = useCanvasStore.getState();
      const currentNode = nodes.find(n => n.id === id);
      const currentMessages = currentNode?.data.messages || [];
      
      const context = getAncestorContext(id, nodes, edges);
      
      const nodeMessages = currentMessages.map(m => ({ role: m.role, content: m.content }));
      // currentMessages already includes the new user message we just added
      const allMessages = [...context, ...nodeMessages];

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
      if (!overridePrompt) {
        setPrompt('');
      }
    }
  };

  const handleRegenerate = () => {
    const { nodes } = useCanvasStore.getState();
    const currentNode = nodes.find(n => n.id === id);
    const currentMessages = currentNode?.data.messages || [];

    if (currentMessages.length === 0) return;

    // Find last user message
    const lastUserIndex = [...currentMessages].reverse().findIndex(m => m.role === 'user');
    if (lastUserIndex === -1) return;
    
    // The index from reverse needs to be converted to actual index
    const realIndex = currentMessages.length - 1 - lastUserIndex;
    const userContent = currentMessages[realIndex].content;
    
    // Truncate store to BEFORE this message
    const newMessages = currentMessages.slice(0, realIndex);
    updateNodeData(id, { messages: newMessages });
    
    // Submit
    handleSubmit(userContent);
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
      updateMessageInNode(id, index, userMessage.content);
      handleSubmit(userMessage.content);
    }
  };

  const handleSplit = (count: number) => {
    splitNode(id, count);
    setShowSplitMenu(false);
  };

  // Split into nodes with the detected content items
  const handleSmartSplit = () => {
    if (detectedItems.length > 0) {
      splitNodeWithContent(id, detectedItems);
    }
    setShowSplitMenu(false);
  };

  return (
    <div 
      className={`
        bg-[#0a0a0a] border rounded-2xl w-[450px] flex flex-col shadow-lg
        ${isLoading ? 'border-gray-500' : ''}
        ${selected ? 'border-white' : 'border-gray-800'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-[#141414] cursor-grab active:cursor-grabbing drag-handle rounded-t-2xl">
        <div className="flex items-center gap-2 relative">
          <button 
            ref={modelBtnRef}
            onClick={() => setShowModelMenu(!showModelMenu)}
            className="flex items-center gap-1 text-xs text-gray-400 font-medium hover:text-white transition-colors nodrag"
            title="Select model"
          >
            {MODELS.find(m => m.id === model)?.name || model}
            <ChevronDown size={12} />
          </button>
          
          {showModelMenu && (
            <div 
              ref={modelMenuRef}
              className="absolute top-full left-0 mt-1 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl z-[100] min-w-[200px] py-1 nodrag cursor-default"
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
        
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setWebSearch(!webSearch)}
            className={`p-1.5 rounded-md transition-all duration-200 nodrag ${webSearch ? 'text-white bg-gray-700' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}
            title={webSearch ? 'Web search enabled' : 'Enable web search'}
          >
            <Globe size={14} />
          </button>
          
          <button 
            onClick={handleRegenerate}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-md transition-colors nodrag"
            title="Regenerate response"
            disabled={isLoading || messages.length === 0}
          >
            <RotateCcw size={14} />
          </button>

          <div className="relative nodrag">
            <button 
              ref={splitBtnRef}
              onClick={() => setShowSplitMenu(!showSplitMenu)}
              className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-md transition-colors nodrag"
              title="Branch into multiple nodes"
            >
              <GitBranch size={14} />
            </button>
            
            {showSplitMenu && (
              <div 
                ref={splitMenuRef}
                className="absolute top-full right-0 mt-1 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl z-[100] min-w-[180px] py-1 nopan nodrag"
              >
                <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-800">Branch options</div>
                
                {/* Smart split option if items detected */}
                {detectedItems.length > 1 && (
                  <button
                    onClick={handleSmartSplit}
                    className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors flex items-center gap-2 border-b border-gray-800"
                  >
                    <Sparkles size={14} className="text-yellow-500" />
                    Split into {detectedItems.length} items
                  </button>
                )}
                
                <div className="px-3 py-1.5 text-xs text-gray-500">Manual split</div>
                {[2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleSplit(n)}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                  >
                    {n} empty branches
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
                  onClick={() => { updateNodeType(id, 'image'); setShowMoreMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-2"
                >
                  <ImageIcon size={14} /> Image Node
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

      {/* Status Indicator */}
      {(isLoading || status) && (
        <div className="px-4 py-2 border-b border-gray-700 bg-[#141414] flex items-center gap-2">
          {status ? (
            <span className="text-xs text-gray-400">{status}</span>
          ) : (
            <>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
              <span className="text-xs text-gray-400">Thinking...</span>
            </>
          )}
        </div>
      )}

      {/* Chat History */}
      <div 
        ref={contentRef}
        className="flex-1 min-h-[80px] max-h-[300px] overflow-y-auto nopan nodrag nowheel"
      >
        {messages.length === 0 ? (
          <div className="p-4 text-gray-600 italic text-sm">Ready to chat...</div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`p-3 ${msg.role === 'user' ? 'bg-[#141414]' : 'bg-transparent'} group/msg animate-slide-up`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    {editingIndex === index ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full bg-[#252525] border border-gray-700 rounded-md p-2 text-sm text-white resize-none focus:border-gray-500 focus:outline-none"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <button 
                            onClick={handleSaveEdit} 
                            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                            title="Save edit"
                          >
                            <Check size={14} />
                          </button>
                          <button 
                            onClick={() => setEditingIndex(null)} 
                            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                            title="Cancel edit"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm leading-relaxed text-gray-200 prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                        
                        <div className="flex items-center gap-1 mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEditMessage(index)}
                            className="p-1 text-gray-500 hover:text-white hover:bg-gray-800 rounded transition-colors"
                            title="Edit message"
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
                          {msg.role === 'assistant' && (
                            <>
                              <button 
                                onClick={() => navigator.clipboard.writeText(msg.content)}
                                className="p-1 text-gray-500 hover:text-white hover:bg-gray-800 rounded transition-colors"
                                title="Copy"
                              >
                                <Copy size={12} />
                              </button>
                              <button 
                                onClick={() => rateMessage(id, index, msg.rating === 'up' ? null : 'up')}
                                className={`p-1 rounded transition-colors ${msg.rating === 'up' ? 'text-green-400 bg-green-900/30' : 'text-gray-500 hover:text-green-400 hover:bg-gray-800'}`}
                                title="Good response"
                              >
                                <ThumbsUp size={12} />
                              </button>
                              <button 
                                onClick={() => rateMessage(id, index, msg.rating === 'down' ? null : 'down')}
                                className={`p-1 rounded transition-colors ${msg.rating === 'down' ? 'text-red-400 bg-red-900/30' : 'text-gray-500 hover:text-red-400 hover:bg-gray-800'}`}
                                title="Bad response"
                              >
                                <ThumbsDown size={12} />
                              </button>
                            </>
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
        
        {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
          <div className="p-3">
             <div className="h-6 w-24 bg-gradient-to-r from-transparent via-gray-700/50 to-transparent animate-shimmer rounded-md" />
          </div>
        )}
      </div>

      {/* Citations */}
      {citations.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-700 flex flex-wrap gap-1 nopan nodrag">
          {citations.slice(0, 3).map((url, i) => (
            <a 
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-gray-400 hover:text-white bg-gray-800 px-2 py-0.5 rounded-full truncate max-w-[120px] transition-colors"
              title={url}
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
      <div className="p-3 border-t border-gray-700 bg-[#1a1a1a] nopan">
        <div className="flex gap-2">
          <Input 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
            placeholder="Type your message..." 
            className="bg-[#252525] border-gray-600 focus:border-gray-500 nodrag"
            disabled={isLoading}
          />
          <Button 
            size="icon" 
            onClick={() => handleSubmit()}
            disabled={isLoading || !prompt.trim()}
            title="Send message"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} className="ml-0.5" />}
          </Button>
        </div>
      </div>

      {/* Reasoning Section - Below input */}
      {(reasoning || (isLoading && model.includes('grok-4') && !model.includes('non-reasoning'))) && (
        <div className="border-t border-gray-700 bg-[#141414] nopan nodrag">
          <button 
            onClick={() => setShowReasoning(!showReasoning)}
            className="w-full px-3 py-2 flex items-center justify-between text-xs text-gray-500 hover:text-gray-300 transition-colors"
            title={showReasoning ? 'Collapse reasoning' : 'Expand reasoning'}
          >
            <span>Reasoning {reasoning ? `(${reasoning.length} chars)` : isLoading ? '(thinking...)' : ''}</span>
            {showReasoning ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showReasoning && (
            <div className="mx-3 mb-2 p-2 text-xs text-gray-500 leading-relaxed max-h-24 overflow-y-auto bg-[#0d0d0d] border border-gray-700 rounded-lg">
              {reasoning || <span className="animate-pulse">Thinking...</span>}
            </div>
          )}
        </div>
      )}

      {/* Handles for connections */}
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
