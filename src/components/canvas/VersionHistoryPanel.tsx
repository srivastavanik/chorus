"use client";

import { useCallback, useState, useEffect } from "react";
import { X, RotateCcw, Clock } from "lucide-react";
import { formatVersionTime } from "@/lib/collaboration";
import { useCanvasStore } from "@/lib/store";

interface Version {
  id: string;
  version_number: number;
  created_by: string | null;
  created_at: string;
}

interface VersionHistoryPanelProps {
  canvasId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function VersionHistoryPanel({
  canvasId,
  isOpen,
  onClose,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  const setNodes = useCanvasStore((state) => state.setNodes);
  const setEdges = useCanvasStore((state) => state.setEdges);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/canvas/versions?canvasId=${canvasId}`);
      const data = await res.json();
      if (data.versions) {
        setVersions(data.versions);
      }
    } catch (e) {
      console.error("Failed to fetch versions:", e);
    } finally {
      setLoading(false);
    }
  }, [canvasId]);

  useEffect(() => {
    if (isOpen && canvasId) {
      fetchVersions();
    }
  }, [isOpen, canvasId, fetchVersions]);

  const handleRestore = async (versionId: string) => {
    if (restoring) return;

    const confirmed = window.confirm(
      "Are you sure you want to restore this version? This will overwrite your current canvas."
    );
    if (!confirmed) return;

    setRestoring(versionId);
    try {
      const res = await fetch("/api/canvas/versions/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvasId, versionId }),
      });

      const data = await res.json();
      if (data.success) {
        // Update the store with restored data
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        onClose();
      }
    } catch (e) {
      console.error("Failed to restore version:", e);
    } finally {
      setRestoring(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-14 bottom-0 w-80 bg-[#0a0a0a] border-l border-white/10 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-gray-400" />
          <h2 className="text-sm font-medium text-white">Version History</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/5 transition-colors"
        >
          <X size={16} className="text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-gray-500 text-sm">
              Loading versions...
            </div>
          </div>
        ) : versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <Clock size={24} className="text-gray-600 mb-2" />
            <p className="text-sm text-gray-500">No version history yet</p>
            <p className="text-xs text-gray-600 mt-1">
              Versions are saved automatically every 5 minutes
            </p>
          </div>
        ) : (
          <div className="py-2">
            {versions.map((version, index) => (
              <div
                key={version.id}
                className="group px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400">
                        v{version.version_number}
                      </span>
                      {index === 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                          Latest
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatVersionTime(version.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestore(version.id)}
                    disabled={restoring === version.id || index === 0}
                    className={`
                      flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-all
                      ${index === 0 
                        ? "opacity-0 pointer-events-none" 
                        : "opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white hover:bg-white/10"
                      }
                      ${restoring === version.id ? "opacity-100" : ""}
                    `}
                  >
                    {restoring === version.id ? (
                      <>
                        <RotateCcw size={12} className="animate-spin" />
                        Restoring...
                      </>
                    ) : (
                      <>
                        <RotateCcw size={12} />
                        Restore
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/5 bg-[#050505]">
        <p className="text-[10px] text-gray-600 text-center">
          Auto-saved every 5 minutes when changes detected
        </p>
      </div>
    </div>
  );
}

