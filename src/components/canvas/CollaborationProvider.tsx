"use client";

import { createContext, useContext, ReactNode } from "react";
import { useCollaboration } from "@/hooks/useCollaboration";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCanvasStore } from "@/lib/store";
import { Collaborator, CollaboratorColor, COLLABORATOR_COLORS } from "@/lib/collaboration";

interface CollaborationContextType {
  collaborators: Collaborator[];
  myColor: CollaboratorColor;
  isConnected: boolean;
  broadcast: (type: string, data: any) => void;
  updateCursor: (cursor: { x: number; y: number } | null) => void;
  setActiveNode: (nodeId: string | null) => void;
  getNodeBorderColor: (nodeId: string) => string | null;
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

export function CollaborationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const canvasId = useCanvasStore((state) => state.canvasId);

  const {
    collaborators,
    myColor,
    isConnected,
    broadcast,
    updateCursor,
    setActiveNode,
  } = useCollaboration({
    canvasId,
    userId: user?.id || null,
    userName: user?.name || null,
    userEmail: user?.email || null,
    userAvatarUrl: user?.avatar_url || null,
    enabled: !!canvasId && !!user,
  });

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
        isConnected,
        broadcast: broadcast as (type: string, data: any) => void,
        updateCursor,
        setActiveNode,
        getNodeBorderColor,
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
      isConnected: false,
      broadcast: () => {},
      updateCursor: () => {},
      setActiveNode: () => {},
      getNodeBorderColor: () => null,
    };
  }
  return context;
}

