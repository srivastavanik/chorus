import { MessageSquare, Image as ImageIcon, Pencil, FileText, X } from 'lucide-react';
import { NodeType } from '@/lib/store';
import { useRef } from 'react';

interface AddBlockMenuProps {
  onSelect: (type: NodeType) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

export function AddBlockMenu({ onSelect, onClose, position }: AddBlockMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const options: { type: NodeType; label: string; icon: React.ElementType; onClick?: () => void }[] = [
    { type: 'text', label: 'Text Node', icon: MessageSquare },
    { type: 'image', label: 'Image Gen', icon: ImageIcon },
    { type: 'scratchpad', label: 'Scratchpad', icon: Pencil },
    { 
      type: 'file', 
      label: 'Upload File', 
      icon: FileText,
      onClick: () => fileInputRef.current?.click() 
    },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, upload to Supabase Storage here
      console.log('File selected:', file.name);
      onSelect('file');
    }
  };

  return (
    <div 
      className="absolute z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden min-w-[180px] animate-in fade-in zoom-in duration-200"
      style={{ 
        left: position.x, 
        top: position.y,
        transform: 'translate(-50%, -50%)' 
      }}
    >
      <div className="flex items-center justify-between p-2 border-b border-gray-800 bg-gray-900">
        <span className="text-xs font-medium text-gray-400 px-1">Add Block</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded">
          <X size={14} />
        </button>
      </div>
      <div className="p-1">
        {options.map((opt) => (
          <button
            key={opt.type}
            onClick={() => opt.onClick ? opt.onClick() : onSelect(opt.type)}
            className="w-full flex items-center gap-2 p-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors text-left"
          >
            <opt.icon size={16} className="opacity-70" />
            {opt.label}
          </button>
        ))}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
