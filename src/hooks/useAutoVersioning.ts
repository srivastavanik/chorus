"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCanvasStore } from "@/lib/store";

const VERSION_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MIN_CHANGES_FOR_VERSION = 1; // Minimum changes before saving a version

export function useAutoVersioning(canvasId: string | null, enabled: boolean = true) {
  const lastVersionTimeRef = useRef<number>(Date.now());
  const lastStateHashRef = useRef<string>("");
  const isSavingRef = useRef<boolean>(false);
  
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);

  // Create a simple hash of the state for comparison
  const getStateHash = useCallback(() => {
    return JSON.stringify({ 
      nodeCount: nodes.length, 
      edgeCount: edges.length,
      nodeIds: nodes.map(n => n.id).sort().join(','),
      edgeIds: edges.map(e => e.id).sort().join(','),
    });
  }, [nodes, edges]);

  const saveVersion = useCallback(async () => {
    if (!canvasId || isSavingRef.current) return;

    const currentHash = getStateHash();
    
    // Don't save if state hasn't changed
    if (currentHash === lastStateHashRef.current) {
      return;
    }

    isSavingRef.current = true;

    try {
      const res = await fetch("/api/canvas/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvasId, nodes, edges }),
      });

      if (res.ok) {
        lastVersionTimeRef.current = Date.now();
        lastStateHashRef.current = currentHash;
        console.log("[AutoVersion] Saved version at", new Date().toISOString());
      } else {
        const data = await res.json();
        // Don't log 403 errors for shared canvases - that's expected
        if (res.status !== 403) {
          console.warn("[AutoVersion] Failed to save version:", data.error);
        }
      }
    } catch (e) {
      console.error("[AutoVersion] Error saving version:", e);
    } finally {
      isSavingRef.current = false;
    }
  }, [canvasId, nodes, edges, getStateHash]);

  useEffect(() => {
    if (!canvasId || !enabled || nodes.length === 0) return;

    // Check if enough time has passed since last version
    const checkAndSave = () => {
      const now = Date.now();
      if (now - lastVersionTimeRef.current >= VERSION_INTERVAL) {
        saveVersion();
      }
    };

    // Check immediately
    checkAndSave();

    // Set up interval to check every minute
    const interval = setInterval(checkAndSave, 60 * 1000);

    return () => clearInterval(interval);
  }, [canvasId, enabled, nodes.length, saveVersion]);

  // Also save on significant changes (optional - can be used for manual triggers)
  return { saveVersion };
}
