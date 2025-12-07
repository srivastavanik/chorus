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
  Edit2,
  Check,
  X,
  Share2,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { useCanvasStore } from "@/lib/store";
import { ShareModal } from "./ShareModal";

interface ShareInfo {
  permission: 'view' | 'edit';
  is_public: boolean;
}

interface CanvasHistory {
  id: string;
  name: string;
  updated_at: string;
  share?: ShareInfo;
  collaborators?: { id: string; avatar_url: string | null; name?: string }[];
}

interface SidebarProps {
  onCanvasSelect?: (id: string | null) => void;
}

export function Sidebar({ onCanvasSelect }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [history, setHistory] = useState<CanvasHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenuId, setShowMenuId] = useState<string | null>(null);
  const [shareCanvasId, setShareCanvasId] = useState<string | null>(null);

  // Renaming state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Get current canvas ID from store to highlight active item
  const currentCanvasId = useCanvasStore((state) => state.canvasId);

  useEffect(() => {
    loadHistory();

    const handleRefresh = () => loadHistory();
    window.addEventListener("canvas-list-updated", handleRefresh);

    return () =>
      window.removeEventListener("canvas-list-updated", handleRefresh);
  }, [currentCanvasId]);

  const loadHistory = async () => {
    try {
      const res = await fetch("/api/canvas");
      const data = await res.json();
      if (Array.isArray(data)) {
        // Fetch share info for each canvas
        const canvasesWithShares = await Promise.all(
          data.map(async (canvas: CanvasHistory) => {
            try {
              const shareRes = await fetch(`/api/canvas/share?canvasId=${canvas.id}`);
              if (shareRes.ok) {
                const shareData = await shareRes.json();
                if (shareData.share) {
                  return {
                    ...canvas,
                    share: shareData.share,
                    collaborators: shareData.collaborators || [],
                  };
                }
              }
            } catch {
              // Ignore share fetch errors
            }
            return canvas;
          })
        );
        setHistory(canvasesWithShares);
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

  const handleShare = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShareCanvasId(id);
    setShowMenuId(null);
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
    <>
      <div
        className={`absolute top-0 left-0 h-full z-50 bg-[#0a0a0a]/90 border-r border-white/5 backdrop-blur-md transition-all duration-300 ease-in-out flex flex-col ${
          isOpen ? "w-64" : "w-0"
        }`}
      >
        <div
          className={`flex flex-col h-full overflow-hidden ${
            !isOpen && "hidden"
          }`}
        >
          {/* Header Area (Logo Removed) */}
          <div className="h-4" />

          {/* New Canvas Button */}
          <div className="p-3">
            <button
              className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-2 rounded-lg text-sm font-medium transition-colors border border-white/5 heading-font tracking-wide uppercase text-[11px]"
              title="Create new canvas"
              onClick={handleNewCanvas}
            >
              <Plus size={14} />
              New Canvas
            </button>
          </div>

          {/* Search */}
          <div className="px-3 pb-2">
            <div className="relative group">
              <Search
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 z-10 group-focus-within:text-white transition-colors"
              />
              <Input
                type="text"
                placeholder="Search..."
                className="pl-9 bg-[#050505] border-white/5 text-xs h-8 focus:border-white/20 transition-all rounded-md placeholder:text-gray-700"
                suppressHydrationWarning
              />
            </div>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
            <div className="px-2 py-1 text-[9px] font-mono text-gray-600 uppercase tracking-widest">
              Recent
            </div>

            {loading ? (
              <div className="px-2 py-4 text-[10px] font-mono text-gray-600 animate-pulse">
                LOADING...
              </div>
            ) : history.length === 0 ? (
              <div className="px-2 py-4 text-[10px] font-mono text-gray-600">
                NO_HISTORY
              </div>
            ) : (
              history.map((item) => {
                const isActive = item.id === currentCanvasId;
                return (
                  <div
                    key={item.id}
                    className={`group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all relative ${
                      isActive
                        ? "bg-white/5 border border-white/5"
                        : "hover:bg-white/[0.02] border border-transparent"
                    }`}
                    onClick={() => handleCanvasClick(item.id)}
                  >
                    <Clock
                      size={12}
                      className={`${
                        isActive
                          ? "text-white"
                          : "text-gray-600 group-hover:text-gray-400"
                      } flex-shrink-0 transition-colors`}
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
                            className="bg-black border border-gray-700 text-white text-xs rounded px-1 py-0.5 w-full focus:outline-none focus:border-white/20"
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
                            onClick={(e) => cancelEditing(e)}
                            className="text-red-500 hover:text-red-400 p-0.5"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <div
                              className={`text-xs truncate transition-colors font-medium flex-1 ${
                                isActive
                                  ? "text-white"
                                  : "text-gray-400 group-hover:text-gray-200"
                              }`}
                            >
                              {item.name}
                            </div>
                            {/* Shared canvas indicator with collaborator avatars */}
                            {item.share && (
                              <div className="flex items-center -space-x-1.5 flex-shrink-0">
                                {item.collaborators && item.collaborators.length > 0 ? (
                                  <>
                                    {item.collaborators.slice(0, 3).map((collab, idx) => (
                                      <div
                                        key={collab.id}
                                        className="w-4 h-4 rounded-full border border-black overflow-hidden bg-gray-700"
                                        style={{ zIndex: 3 - idx }}
                                        title={collab.name || 'Collaborator'}
                                      >
                                        {collab.avatar_url ? (
                                          <img
                                            src={collab.avatar_url}
                                            alt=""
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-[8px] text-white">
                                            {(collab.name || '?')[0].toUpperCase()}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                    {item.collaborators.length > 3 && (
                                      <div className="w-4 h-4 rounded-full border border-black bg-gray-600 flex items-center justify-center text-[8px] text-white">
                                        +{item.collaborators.length - 3}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <Users size={10} className="text-gray-500" />
                                )}
                              </div>
                            )}
                          </div>
                          <div
                            className={`text-[9px] font-mono transition-colors ${
                              isActive ? "text-gray-500" : "text-gray-700"
                            }`}
                          >
                            {formatDate(item.updated_at)}
                          </div>
                        </>
                      )}
                    </div>

                    {editingId !== item.id && (
                      <div className="relative">
                        <button
                          className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
                            isActive
                              ? "text-gray-400 hover:text-white"
                              : "text-gray-600 hover:text-gray-300"
                          }`}
                          title="More options"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenuId(
                              showMenuId === item.id ? null : item.id
                            );
                          }}
                        >
                          <MoreHorizontal size={12} />
                        </button>
                        {showMenuId === item.id && (
                          <div className="absolute right-0 top-full mt-1 w-32 bg-[#0a0a0a] border border-white/10 rounded-lg shadow-2xl z-50 py-1">
                            <button
                              onClick={(e) => handleShare(item.id, e)}
                              className="w-full text-left px-3 py-2 text-[10px] font-mono uppercase tracking-wide text-gray-400 hover:bg-white/5 hover:text-white flex items-center gap-2"
                            >
                              <Share2 size={10} />
                              Share
                            </button>
                            <button
                              onClick={(e) => startEditing(item.id, item.name, e)}
                              className="w-full text-left px-3 py-2 text-[10px] font-mono uppercase tracking-wide text-gray-400 hover:bg-white/5 hover:text-white flex items-center gap-2"
                            >
                              <Edit2 size={10} />
                              Rename
                            </button>
                            <button
                              onClick={(e) => handleDelete(item.id, e)}
                              className="w-full text-left px-3 py-2 text-[10px] font-mono uppercase tracking-wide text-red-400 hover:bg-red-900/10 flex items-center gap-2"
                            >
                              <Trash2 size={10} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute -right-6 top-6 bg-[#0a0a0a] border border-white/5 border-l-0 text-gray-500 hover:text-white p-1 rounded-r-md shadow-lg transition-colors backdrop-blur-sm"
          title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {/* Share Modal */}
      {shareCanvasId && (
        <ShareModal
          canvasId={shareCanvasId}
          isOpen={!!shareCanvasId}
          onClose={() => setShareCanvasId(null)}
        />
      )}
    </>
  );
}
