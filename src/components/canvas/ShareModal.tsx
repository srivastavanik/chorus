"use client";

import { useState, useEffect } from "react";
import { X, Copy, Check, Globe, Lock, Eye, Edit, Link2 } from "lucide-react";
import { getShareUrl, SharePermission } from "@/lib/collaboration";

interface ShareModalProps {
  canvasId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ShareSettings {
  id: string;
  canvas_id: string;
  share_token: string;
  permission: SharePermission;
  is_public: boolean;
  created_at: string;
}

export function ShareModal({ canvasId, isOpen, onClose }: ShareModalProps) {
  const [loading, setLoading] = useState(false);
  const [share, setShare] = useState<ShareSettings | null>(null);
  const [copied, setCopied] = useState(false);
  const [permission, setPermission] = useState<SharePermission>("view");
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (isOpen && canvasId) {
      fetchShareSettings();
    }
  }, [isOpen, canvasId]);

  const fetchShareSettings = async () => {
    try {
      const res = await fetch(`/api/canvas/share?canvasId=${canvasId}`);
      const data = await res.json();
      if (data.shares && data.shares.length > 0) {
        const s = data.shares[0];
        setShare(s);
        setPermission(s.permission);
        setIsPublic(s.is_public);
      }
    } catch (e) {
      console.error("Failed to fetch share settings:", e);
    }
  };

  const handleCreateOrUpdate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/canvas/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvasId, permission, isPublic }),
      });
      const data = await res.json();
      if (data.share) {
        setShare(data.share);
        setPermission(data.share.permission);
        setIsPublic(data.share.is_public);
      }
    } catch (e) {
      console.error("Failed to create/update share:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await fetch(`/api/canvas/share?canvasId=${canvasId}`, {
        method: "DELETE",
      });
      setShare(null);
      setPermission("view");
      setIsPublic(false);
    } catch (e) {
      console.error("Failed to delete share:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (share) {
      await navigator.clipboard.writeText(getShareUrl(share.share_token));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Link2 size={18} className="text-gray-400" />
            <h2 className="text-sm font-medium text-white">Share Canvas</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Visibility Toggle */}
          <div className="space-y-3">
            <label className="text-xs font-mono uppercase tracking-wider text-gray-500">
              Visibility
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsPublic(false)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                  !isPublic
                    ? "border-white/20 bg-white/5"
                    : "border-white/5 hover:border-white/10"
                }`}
              >
                <Lock
                  size={16}
                  className={isPublic ? "text-gray-500" : "text-white"}
                />
                <span
                  className={`text-sm ${
                    isPublic ? "text-gray-500" : "text-white"
                  }`}
                >
                  Private
                </span>
              </button>
              <button
                onClick={() => setIsPublic(true)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                  isPublic
                    ? "border-white/20 bg-white/5"
                    : "border-white/5 hover:border-white/10"
                }`}
              >
                <Globe
                  size={16}
                  className={!isPublic ? "text-gray-500" : "text-white"}
                />
                <span
                  className={`text-sm ${
                    !isPublic ? "text-gray-500" : "text-white"
                  }`}
                >
                  Public
                </span>
              </button>
            </div>
          </div>

          {/* Permission */}
          <div className="space-y-3">
            <label className="text-xs font-mono uppercase tracking-wider text-gray-500">
              Access Level
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPermission("view")}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                  permission === "view"
                    ? "border-white/20 bg-white/5"
                    : "border-white/5 hover:border-white/10"
                }`}
              >
                <Eye
                  size={16}
                  className={
                    permission !== "view" ? "text-gray-500" : "text-white"
                  }
                />
                <span
                  className={`text-sm ${
                    permission !== "view" ? "text-gray-500" : "text-white"
                  }`}
                >
                  View Only
                </span>
              </button>
              <button
                onClick={() => setPermission("edit")}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                  permission === "edit"
                    ? "border-white/20 bg-white/5"
                    : "border-white/5 hover:border-white/10"
                }`}
              >
                <Edit
                  size={16}
                  className={
                    permission !== "edit" ? "text-gray-500" : "text-white"
                  }
                />
                <span
                  className={`text-sm ${
                    permission !== "edit" ? "text-gray-500" : "text-white"
                  }`}
                >
                  Can Edit
                </span>
              </button>
            </div>
          </div>

          {/* Share Link */}
          {share && (
            <div className="space-y-3">
              <label className="text-xs font-mono uppercase tracking-wider text-gray-500">
                Share Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={getShareUrl(share.share_token)}
                  className="flex-1 px-3 py-2 text-xs bg-black/50 border border-white/10 rounded-lg text-gray-400 font-mono"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {copied ? (
                    <Check size={16} className="text-green-400" />
                  ) : (
                    <Copy size={16} className="text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {share ? (
              <>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  Remove Share
                </button>
                <button
                  onClick={handleCreateOrUpdate}
                  disabled={loading}
                  className="flex-1 px-4 py-2 text-xs font-mono uppercase tracking-wider text-black bg-white rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Update Settings"}
                </button>
              </>
            ) : (
              <button
                onClick={handleCreateOrUpdate}
                disabled={loading}
                className="w-full px-4 py-2 text-xs font-mono uppercase tracking-wider text-black bg-white rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Share Link"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

