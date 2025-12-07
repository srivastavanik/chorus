"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  MoreHorizontal,
  Clock,
  Trash2,
  LogOut,
  Edit2,
  Check,
  X,
} from "lucide-react";
import Image from "next/image";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/components/auth/AuthProvider";

interface CanvasHistory {
  id: string;
  name: string;
  updated_at: string;
}

interface SidebarProps {
  onCanvasSelect?: (id: string | null) => void;
}

export function Sidebar({ onCanvasSelect }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [history, setHistory] = useState<CanvasHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenuId, setShowMenuId] = useState<string | null>(null);

  // Renaming state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const { logout } = useAuth();

  useEffect(() => {
    loadHistory();

    const handleRefresh = () => loadHistory();
    window.addEventListener("canvas-list-updated", handleRefresh);

    return () =>
      window.removeEventListener("canvas-list-updated", handleRefresh);
  }, []);

  const loadHistory = async () => {
    try {
      const res = await fetch("/api/canvas");
      const data = await res.json();
      if (Array.isArray(data)) {
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewCanvas = () => {
    if (onCanvasSelect) {
      onCanvasSelect(null);
    } else {
      // Fallback if not passed, though it should be
      window.location.href = "/";
    }
  };

  const handleCanvasClick = (id: string) => {
    if (onCanvasSelect) {
      onCanvasSelect(id);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/canvas?id=${id}`, { method: "DELETE" });
      setHistory((prev) => prev.filter((c) => c.id !== id));
      setShowMenuId(null);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const startEditing = (
    id: string,
    currentName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setEditingId(id);
    setEditName(currentName);
    setShowMenuId(null);
  };

  const cancelEditing = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditName("");
  };

  const saveRename = async (id: string, e: React.SyntheticEvent) => {
    e.stopPropagation();
    if (!editName.trim()) return;

    try {
      const res = await fetch("/api/canvas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: editName }),
      });

      if (res.ok) {
        setHistory((prev) =>
          prev.map((c) => (c.id === id ? { ...c, name: editName } : c))
        );
        setEditingId(null);
      }
    } catch (err) {
      console.error("Rename failed", err);
    }
  };

  const handleSignOut = async () => {
    await logout();
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div
      className={`absolute top-0 left-0 h-full z-50 bg-gray-900/95 border-r border-gray-800 backdrop-blur-md transition-all duration-300 ease-in-out flex flex-col ${
        isOpen ? "w-64" : "w-0"
      }`}
    >
      <div
        className={`flex flex-col h-full overflow-hidden ${
          !isOpen && "hidden"
        }`}
      >
        {/* Header Area (Logo Removed) */}
        <div className="h-4" /> {/* Spacer since we removed the logo header */}
        {/* New Canvas Button */}
        <div className="p-3">
          <button
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-black py-2 rounded-lg text-sm font-medium transition-colors"
            title="Create new canvas"
            onClick={handleNewCanvas}
          >
            <Plus size={16} />
            New Canvas
          </button>
        </div>
        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 z-10"
            />
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
          <div className="px-2 py-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
            Recent
          </div>

          {loading ? (
            <div className="px-2 py-4 text-xs text-gray-500">Loading...</div>
          ) : history.length === 0 ? (
            <div className="px-2 py-4 text-xs text-gray-500">
              No canvases yet
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="group flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50 cursor-pointer transition-colors relative"
                onClick={() => handleCanvasClick(item.id)}
              >
                <Clock
                  size={14}
                  className="text-gray-500 group-hover:text-gray-400 flex-shrink-0"
                />

                <div className="flex-1 min-w-0">
                  {editingId === item.id ? (
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-black border border-gray-700 text-white text-xs rounded px-1 py-0.5 w-full focus:outline-none focus:border-red-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(item.id, e);
                          if (e.key === "Escape") cancelEditing(e);
                        }}
                      />
                      <button
                        onClick={(e) => saveRename(item.id, e)}
                        className="text-green-500 hover:text-green-400 p-0.5"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="text-red-500 hover:text-red-400 p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm text-gray-300 truncate group-hover:text-white">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-gray-600">
                        {formatDate(item.updated_at)}
                      </div>
                    </>
                  )}
                </div>

                {editingId !== item.id && (
                  <div className="relative">
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-white hover:bg-gray-700 rounded transition-all"
                      title="More options"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenuId(showMenuId === item.id ? null : item.id);
                      }}
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    {showMenuId === item.id && (
                      <div className="absolute right-0 top-full mt-1 w-32 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl z-50 py-1">
                        <button
                          onClick={(e) => startEditing(item.id, item.name, e)}
                          className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 hover:text-white flex items-center gap-2"
                        >
                          <Edit2 size={12} />
                          Rename
                        </button>
                        <button
                          onClick={(e) => handleDelete(item.id, e)}
                          className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-gray-800 hover:text-red-300 flex items-center gap-2"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        {/* Sign Out Button */}
        <div className="p-3 border-t border-gray-800">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-white hover:bg-gray-800 py-2 rounded-lg text-sm transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-8 top-4 bg-gray-900 border border-gray-800 border-l-0 text-gray-400 hover:text-white p-1.5 rounded-r-lg shadow-md transition-colors"
        title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
    </div>
  );
}
