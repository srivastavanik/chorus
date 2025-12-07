'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Home, LogOut } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

export function NavBar({ onHomeClick }: { onHomeClick: () => void }) {
  const { user, logout } = useAuth();

  return (
    <nav className="h-14 border-b border-gray-800 bg-black/50 backdrop-blur-md flex items-center px-4 justify-between z-50 w-full">
      <div className="flex items-center gap-4">
        <button onClick={onHomeClick} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 relative">
            <Image 
              src="/logo.png" 
              alt="Chorus" 
              fill 
              className="object-contain" 
            />
          </div>
        </button>
        
        <div className="h-4 w-px bg-gray-800 mx-2" />
        
        <button 
            onClick={onHomeClick}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/5"
        >
            Dashboard
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111] border border-gray-800 hover:border-gray-700 transition-colors cursor-default">
            <div className="w-5 h-5 rounded-full bg-[#222] border border-gray-700 flex items-center justify-center text-[10px] font-medium text-gray-400">
                {user?.email?.[0].toUpperCase()}
            </div>
            <span className="text-xs text-gray-400 max-w-[150px] truncate">
                {user?.email}
            </span>
        </div>
        
        <button 
            onClick={() => logout()}
            className="p-2 text-gray-500 hover:text-white hover:bg-[#111] rounded-full transition-colors"
            title="Sign out"
        >
            <LogOut size={16} />
        </button>
      </div>
    </nav>
  );
}
