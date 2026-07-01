'use client';

import { MessageSquare, Image as ImageIcon, StickyNote, FileText, X } from 'lucide-react';
import { NodeType } from '@/lib/store';
import { useRef } from 'react';

interface AddBlockMenuProps {
  onSelect: (type: NodeType) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

export function AddBlockMenu({ onSelect, onClose, position }: AddBlockMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const options: { type: NodeType; label: string; icon: React.ElementType; description: string }[] = [
    { type: 'text', label: 'Text', icon: MessageSquare, description: 'Chat with Grok AI' },
    { type: 'image', label: 'Image', icon: ImageIcon, description: 'Generate images' },
    { type: 'postit', label: 'Post-it', icon: StickyNote, description: 'Sticky note for quick notes' },
    { type: 'file', label: 'Upload', icon: FileText, description: 'Attach a file' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('File selected:', file.name);
      onSelect('file');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Menu */}
      <div 
        className="fixed z-50 bg-[#0a0a0a]/95 border border-gray-800 rounded-xl shadow-2xl overflow-hidden min-w-[200px] backdrop-blur-sm animate-in"
        style={{ 
          left: position.x, 
          top: position.y,
          transform: 'translate(-50%, -50%)' 
        }}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
          <span className="text-xs font-medium text-gray-400">Add Block</span>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-white p-1 rounded-md hover:bg-gray-800 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        <div className="p-1.5">
          {options.map((opt, index) => (
            <button
              key={opt.type}
              onClick={() => (opt.type === 'file' ? fileInputRef.current?.click() : onSelect(opt.type))}
              className="w-full flex items-center gap-3 p-2.5 text-sm text-gray-300 hover:bg-[#141414] hover:text-white rounded-lg transition-all duration-150 text-left group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="w-8 h-8 rounded-lg bg-[#141414] flex items-center justify-center group-hover:bg-[#1a1a1a] transition-colors">
                <opt.icon size={16} className="opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{opt.label}</div>
                <div className="text-xs text-gray-500 group-hover:text-gray-400">{opt.description}</div>
              </div>
            </button>
          ))}
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileChange}
          />
        </div>
        <div className="px-3 py-2 border-t border-gray-800 bg-gray-950/50">
          <p className="text-[10px] text-gray-600">Right-click anywhere to open this menu</p>
        </div>
      </div>
    </>
  );
}
