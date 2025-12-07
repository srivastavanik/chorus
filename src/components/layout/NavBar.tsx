'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Home, LogOut } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

export function NavBar({ onHomeClick }: { onHomeClick: () => void }) {
  const { user, logout } = useAuth();

  return (
    <nav className="h-14 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md flex items-center px-6 justify-between z-50 w-full sticky top-0">
      <div className="flex items-center gap-6">
        <button onClick={onHomeClick} className="flex items-center gap-2 hover:opacity-80 transition-opacity group">
          <div className="w-24 h-6 relative opacity-90 group-hover:opacity-100 transition-opacity">
            <Image 
              src="/xai.png" 
              alt="Chorus" 
              fill 
              className="object-contain object-left" 
            />
          </div>
        </button>
        
        <div className="h-4 w-px bg-white/10 mx-2 hidden md:block" />
        
        <button 
            onClick={onHomeClick}
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-gray-500 hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-white/5"
        >
            Dashboard
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/5 hover:border-white/10 transition-colors cursor-default">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-700 to-black border border-white/10 flex items-center justify-center text-[10px] font-medium text-white shadow-inner">
                {user?.email?.[0].toUpperCase()}
            </div>
            <span className="text-xs text-gray-400 max-w-[150px] truncate font-mono">
                {user?.email}
            </span>
        </div>
        
        <button 
            onClick={() => logout()}
            className="p-2 text-gray-500 hover:text-red-400 hover:bg-white/5 rounded-full transition-colors"
            title="Sign out"
        >
            <LogOut size={16} />
        </button>
      </div>
    </nav>
  );
}
