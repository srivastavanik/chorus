'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, ChevronLeft, ChevronRight, Search, 
  MoreHorizontal, Clock
} from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';

interface CanvasHistory {
  id: string;
  name: string;
  updated_at: string;
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [history, setHistory] = useState<CanvasHistory[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('canvases')
        .select('id, name, updated_at')
        .order('updated_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div 
      className={`absolute top-0 left-0 h-full z-50 bg-gray-900/95 border-r border-gray-800 backdrop-blur-md transition-all duration-300 ease-in-out flex flex-col ${
        isOpen ? 'w-64' : 'w-0'
      }`}
    >
      <div className={`flex flex-col h-full overflow-hidden ${!isOpen && 'hidden'}`}>
        {/* Header with Logo */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-center">
          <div className="w-24 h-24 relative select-none">
            <Image 
              src="/logo.png" 
              alt="Logo" 
              fill 
              sizes="96px" 
              className="object-contain" 
              draggable={false}
            />
          </div>
        </div>

        {/* New Canvas Button */}
        <div className="p-3">
          <button 
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-black py-2 rounded-lg text-sm font-medium transition-colors"
            title="Create new canvas"
          >
            <Plus size={16} />
            New Canvas
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 z-10" />
            <Input 
              type="text" 
              placeholder="Search..." 
              className="pl-9 bg-[#1a1a1a] border-gray-700 text-xs h-8"
              suppressHydrationWarning
            />
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          <div className="px-2 py-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Recent</div>
          
          {loading ? (
            <div className="px-2 py-4 text-xs text-gray-500">Loading...</div>
          ) : history.length === 0 ? (
            <div className="px-2 py-4 text-xs text-gray-500">No canvases yet</div>
          ) : (
            history.map((item) => (
              <div 
                key={item.id} 
                className="group flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50 cursor-pointer transition-colors"
              >
                <Clock size={14} className="text-gray-500 group-hover:text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-300 truncate group-hover:text-white">{item.name}</div>
                  <div className="text-[10px] text-gray-600">{formatDate(item.updated_at)}</div>
                </div>
                <button 
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-white hover:bg-gray-700 rounded transition-all"
                  title="More options"
                >
                  <MoreHorizontal size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-8 top-4 bg-gray-900 border border-gray-800 border-l-0 text-gray-400 hover:text-white p-1.5 rounded-r-lg shadow-md transition-colors"
        title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
    </div>
  );
}
