"use client";

import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useCollaboration } from "@/hooks/useCollaboration";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCanvasStore } from "@/lib/store";
import { Collaborator, CollaboratorColor, COLLABORATOR_COLORS } from "@/lib/collaboration";

interface CollaborationContextType {
  collaborators: Collaborator[];
  myColor: CollaboratorColor;
  setMyColor: (color: CollaboratorColor) => void;
  isConnected: boolean;
  broadcast: (type: string, data: any) => void;
  updateCursor: (cursor: { x: number; y: number } | null) => void;
  setActiveNode: (nodeId: string | null) => void;
  forceSyncState: () => void;
  getNodeBorderColor: (nodeId: string) => string | null;
  markNodePending: (nodeId: string) => void;
  markEdgePending: (edgeId: string) => void;
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

// Persist preferred color in localStorage
const PREFERRED_COLOR_KEY = 'chorus_preferred_color';

export function CollaborationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const canvasId = useCanvasStore((state) => state.canvasId);
  
  // Load preferred color from localStorage
  const [preferredColor, setPreferredColor] = useState<CollaboratorColor | undefined>(undefined);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(PREFERRED_COLOR_KEY);
      if (stored && COLLABORATOR_COLORS.includes(stored as CollaboratorColor)) {
        setPreferredColor(stored as CollaboratorColor);
      }
    }
  }, []);

  const {
    collaborators,
    myColor,
    setMyColor: setMyColorInternal,
    isConnected,
    broadcast,
    updateCursor,
    setActiveNode,
    forceSyncState,
    markNodePending,
    markEdgePending,
  } = useCollaboration({
    canvasId,
    userId: user?.id || null,
    userName: user?.name || null,
    userEmail: user?.email || null,
    userAvatarUrl: user?.avatar_url || null,
    preferredColor,
    enabled: !!canvasId && !!user,
  });

  // Wrapper to also persist color
  const setMyColor = (color: CollaboratorColor) => {
    setMyColorInternal(color);
    setPreferredColor(color);
    if (typeof window !== 'undefined') {
      localStorage.setItem(PREFERRED_COLOR_KEY, color);
    }
  };

  // Get the border color for a node if a collaborator is active on it
  const getNodeBorderColor = (nodeId: string): string | null => {
    const activeCollaborator = collaborators.find(
      (c) => c.activeNodeId === nodeId
    );
    return activeCollaborator?.color || null;
  };

  return (
    <CollaborationContext.Provider
      value={{
        collaborators,
        myColor,
        setMyColor,
        isConnected,
        broadcast: broadcast as (type: string, data: any) => void,
        updateCursor,
        setActiveNode,
        forceSyncState,
        getNodeBorderColor,
        markNodePending,
        markEdgePending,
      }}
    >
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaborationContext() {
  const context = useContext(CollaborationContext);
  if (!context) {
    // Return a no-op context for when collaboration is not available
    return {
      collaborators: [],
      myColor: COLLABORATOR_COLORS[0],
      setMyColor: () => {},
      isConnected: false,
      broadcast: () => {},
      updateCursor: () => {},
      setActiveNode: () => {},
      forceSyncState: () => {},
      getNodeBorderColor: () => null,
      markNodePending: () => {},
      markEdgePending: () => {},
    };
  }
  return context;
}
