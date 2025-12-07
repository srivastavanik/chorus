'use client';

import { useCanvasStore } from '@/lib/store';
import { Loader2, Check, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';

export function AutosaveStatus() {
  const saveStatus = useCanvasStore((state) => state.saveStatus);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (saveStatus === 'idle') {
      // Delay hiding to allow transition out
      const timeout = setTimeout(() => setIsVisible(false), 2000);
      return () => clearTimeout(timeout);
    } else {
      setIsVisible(true);
    }
  }, [saveStatus]);

  if (!isVisible && saveStatus === 'idle') return null;

  return (
    <div 
      className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md transition-all duration-300 ${
        saveStatus === 'error' 
          ? 'bg-red-900/50 text-red-200 border border-red-800' 
          : 'bg-gray-900/50 text-gray-300 border border-gray-800'
      } ${
        saveStatus === 'idle' ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'
      }`}
    >
      {saveStatus === 'saving' && (
        <>
          <Loader2 size={14} className="animate-spin text-blue-400" />
          <span className="text-xs font-medium">Saving...</span>
        </>
      )}
      
      {saveStatus === 'saved' && (
        <>
          <Check size={14} className="text-green-400" />
          <span className="text-xs font-medium">Saved</span>
        </>
      )}

      {saveStatus === 'error' && (
        <>
          <AlertTriangle size={14} className="text-red-400" />
          <span className="text-xs font-medium">Save failed</span>
        </>
      )}
    </div>
  );
}

