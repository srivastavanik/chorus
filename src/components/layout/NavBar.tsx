"use client";

import { useState } from "react";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useClickOutside } from "@/hooks/useClickOutside";

export function NavBar({ onHomeClick }: { onHomeClick: () => void }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useClickOutside<HTMLDivElement>(() => setMenuOpen(false));

  const handleSignOut = () => {
    setMenuOpen(false);
    logout();
  };

  return (
    <nav className="h-14 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md flex items-center px-6 justify-between z-50 w-full sticky top-0">
      <div className="flex items-center gap-2">
        <button
          onClick={onHomeClick}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity group"
        >
          <div className="w-20 h-6 relative opacity-90 group-hover:opacity-100 transition-opacity">
            <Image
              src="/xai.png"
              alt="Chorus"
              fill
              className="object-contain object-left"
            />
          </div>
        </button>

        <button
          onClick={onHomeClick}
          className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-gray-500 hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-white/5"
        >
          Dashboard
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/* User Menu Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/5 hover:border-white/10 transition-colors cursor-pointer group"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-700 to-black border border-white/10 flex items-center justify-center text-[10px] font-medium text-white shadow-inner group-hover:scale-105 transition-transform">
              {user?.email?.[0].toUpperCase()}
            </div>
            <span className="text-xs text-gray-400 max-w-[150px] truncate font-mono hidden md:block">
              {user?.email}
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-[#0a0a0a] border border-white/10 rounded-lg shadow-2xl z-50 py-1 overflow-hidden backdrop-blur-xl">
              <div className="px-3 py-2 border-b border-white/5 md:hidden">
                <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">
                  Signed in as
                </p>
                <p className="text-xs text-white truncate font-medium">
                  {user?.email}
                </p>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full text-left px-3 py-2 text-xs font-mono uppercase tracking-wider text-red-400 hover:bg-white/5 hover:text-red-300 flex items-center gap-2 transition-colors"
              >
                <LogOut size={12} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
