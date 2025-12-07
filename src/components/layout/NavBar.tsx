"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { LogOut, Camera, Users } from "lucide-react";
import { useAuth, User } from "@/components/auth/AuthProvider";
import { useClickOutside } from "@/hooks/useClickOutside";
import { getAvatarUrl } from "@/lib/collaboration";

interface NavBarProps {
  onHomeClick: () => void;
  collaborators?: Array<{
    id: string;
    name: string;
    avatarUrl: string | null;
    color: string;
  }>;
}

export function NavBar({ onHomeClick, collaborators = [] }: NavBarProps) {
  const { user, logout, updateUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useClickOutside<HTMLDivElement>(() => setMenuOpen(false));

  const handleSignOut = () => {
    setMenuOpen(false);
    logout();
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.avatarUrl) {
        updateUser({ avatar_url: data.avatarUrl });
      }
    } catch (e) {
      console.error('Avatar upload failed:', e);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const avatarUrl = user ? getAvatarUrl(user.avatar_url, user.email) : null;

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
        {/* Collaborators */}
        {collaborators.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex -space-x-2">
              {collaborators.slice(0, 5).map((collab) => (
                <div
                  key={collab.id}
                  className="w-7 h-7 rounded-full border-2 overflow-hidden"
                  style={{ borderColor: collab.color }}
                  title={collab.name}
                >
                  <img
                    src={getAvatarUrl(collab.avatarUrl, collab.name)}
                    alt={collab.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            {collaborators.length > 5 && (
              <span className="text-xs text-gray-400 ml-1">
                +{collaborators.length - 5}
              </span>
            )}
            <div className="flex items-center gap-1 ml-2 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-green-400 font-mono">
                {collaborators.length + 1} online
              </span>
            </div>
          </div>
        )}

        {/* User Menu Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/5 hover:border-white/10 transition-colors cursor-pointer group"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden border border-white/10 group-hover:scale-105 transition-transform">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user?.name || user?.email || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-700 to-black flex items-center justify-center text-[10px] font-medium text-white">
                  {user?.email?.[0].toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-400 max-w-[150px] truncate font-mono hidden md:block">
              {user?.email}
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-[#0a0a0a] border border-white/10 rounded-lg shadow-2xl z-50 py-1 overflow-hidden backdrop-blur-xl">
              <div className="px-3 py-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={user?.name || user?.email || 'User'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-700 to-black flex items-center justify-center text-sm font-medium text-white">
                          {user?.email?.[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleAvatarClick}
                      disabled={uploading}
                      className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                    >
                      <Camera size={14} className="text-white" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    {user?.name && (
                      <p className="text-sm text-white truncate font-medium">
                        {user.name}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
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
