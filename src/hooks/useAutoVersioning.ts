"use client";

import { useEffect, useRef } from "react";
import { useCanvasStore } from "@/lib/store";

const VERSION_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useAutoVersioning(canvasId: string | null, enabled: boolean = true) {
  const lastVersionTimeRef = useRef<number>(0);
  const lastStateRef = useRef<string>("");
  
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);

  useEffect(() => {
    if (!canvasId || !enabled) return;

    const checkAndSaveVersion = async () => {
      const now = Date.now();
      
      // Check if enough time has passed
      if (now - lastVersionTimeRef.current < VERSION_INTERVAL) {
        return;
      }

      // Create a hash of current state
      const currentState = JSON.stringify({ nodes, edges });
      
      // Check if state has changed since last version
      if (currentState === lastStateRef.current) {
        return;
      }

      // Save version
      try {
        const res = await fetch("/api/canvas/versions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ canvasId, nodes, edges }),
        });

        if (res.ok) {
          lastVersionTimeRef.current = now;
          lastStateRef.current = currentState;
          console.log("[AutoVersion] Saved version at", new Date().toISOString());
        }
      } catch (e) {
        console.error("[AutoVersion] Failed to save version:", e);
      }
    };

    // Check immediately on mount
    checkAndSaveVersion();

    // Set up interval
    const interval = setInterval(checkAndSaveVersion, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, [canvasId, nodes, edges, enabled]);
}

