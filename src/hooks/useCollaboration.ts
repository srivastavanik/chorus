"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import {
  Collaborator,
  CollaboratorColor,
  COLLABORATOR_COLORS,
  assignColor,
  getAvatarUrl,
} from "@/lib/collaboration";
import { useCanvasStore } from "@/lib/store";

interface UseCollaborationOptions {
  canvasId: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userAvatarUrl: string | null;
  enabled?: boolean;
}

interface PresencePayload {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  cursor: { x: number; y: number } | null;
  activeNodeId: string | null;
}

interface BroadcastPayload {
  type: "node:update" | "node:create" | "node:delete" | "edge:create" | "edge:delete" | "cursor";
  userId: string;
  data: any;
}

export function useCollaboration({
  canvasId,
  userId,
  userName,
  userEmail,
  userAvatarUrl,
  enabled = true,
}: UseCollaborationOptions) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [myColor, setMyColor] = useState<CollaboratorColor>(COLLABORATOR_COLORS[0]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceStateRef = useRef<Map<string, PresencePayload>>(new Map());

  // Store actions
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const setNodes = useCanvasStore((state) => state.setNodes);
  const setEdges = useCanvasStore((state) => state.setEdges);

  // Subscribe to channel
  useEffect(() => {
    if (!canvasId || !userId || !enabled) {
      return;
    }

    const channelName = `canvas:${canvasId}`;
    
    // Create channel with presence
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channelRef.current = channel;

    // Handle presence sync
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PresencePayload>();
      const newCollaborators: Collaborator[] = [];
      let colorIndex = 0;

      Object.entries(state).forEach(([key, presences]) => {
        if (key === userId) return; // Skip self

        const presence = presences[0] as unknown as PresencePayload;
        if (presence && presence.id) {
          newCollaborators.push({
            id: presence.id,
            name: presence.name || presence.email || "Anonymous",
            email: presence.email || "",
            avatarUrl: presence.avatarUrl,
            color: assignColor(colorIndex),
            cursor: presence.cursor,
            activeNodeId: presence.activeNodeId,
            lastSeen: Date.now(),
          });
          colorIndex++;
        }
      });

      setCollaborators(newCollaborators);
    });

    // Handle presence join
    channel.on("presence", { event: "join" }, ({ key, newPresences }) => {
      if (key === userId) return;

      const presence = newPresences[0] as unknown as PresencePayload;
      if (presence && presence.id) {
        presenceStateRef.current.set(key, presence);
      }
    });

    // Handle presence leave
    channel.on("presence", { event: "leave" }, ({ key }) => {
      presenceStateRef.current.delete(key);
      setCollaborators((prev) => prev.filter((c) => c.id !== key));
    });

    // Handle broadcast messages
    channel.on("broadcast", { event: "canvas_update" }, ({ payload }) => {
      const { type, userId: senderId, data } = payload as BroadcastPayload;
      
      // Ignore own broadcasts
      if (senderId === userId) return;

      switch (type) {
        case "node:update":
          if (data.nodeId && data.updates) {
            updateNodeData(data.nodeId, data.updates);
          }
          break;
        case "node:create":
        case "node:delete":
          // Full sync for create/delete
          if (data.nodes) {
            setNodes(data.nodes);
          }
          break;
        case "edge:create":
        case "edge:delete":
          if (data.edges) {
            setEdges(data.edges);
          }
          break;
        case "cursor":
          // Update cursor position for collaborator
          setCollaborators((prev) =>
            prev.map((c) =>
              c.id === senderId ? { ...c, cursor: data.cursor } : c
            )
          );
          break;
      }
    });

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        
        // Assign color based on current collaborator count
        const state = channel.presenceState();
        const myIndex = Object.keys(state).length;
        setMyColor(assignColor(myIndex));

        // Track presence
        await channel.track({
          id: userId,
          name: userName || userEmail || "Anonymous",
          email: userEmail || "",
          avatarUrl: userAvatarUrl,
          cursor: null,
          activeNodeId: null,
        } as PresencePayload);
      }
    });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
      setCollaborators([]);
    };
  }, [canvasId, userId, userName, userEmail, userAvatarUrl, enabled, updateNodeData, setNodes, setEdges]);

  // Broadcast a change to all collaborators
  const broadcast = useCallback(
    (type: BroadcastPayload["type"], data: any) => {
      if (!channelRef.current || !userId) return;

      channelRef.current.send({
        type: "broadcast",
        event: "canvas_update",
        payload: { type, userId, data },
      });
    },
    [userId]
  );

  // Update cursor position
  const updateCursor = useCallback(
    (cursor: { x: number; y: number } | null) => {
      if (!channelRef.current || !userId) return;

      channelRef.current.track({
        id: userId,
        name: userName || userEmail || "Anonymous",
        email: userEmail || "",
        avatarUrl: userAvatarUrl,
        cursor,
        activeNodeId: null,
      } as PresencePayload);
    },
    [userId, userName, userEmail, userAvatarUrl]
  );

  // Update active node (for highlighting)
  const setActiveNode = useCallback(
    (nodeId: string | null) => {
      if (!channelRef.current || !userId) return;

      channelRef.current.track({
        id: userId,
        name: userName || userEmail || "Anonymous",
        email: userEmail || "",
        avatarUrl: userAvatarUrl,
        cursor: null,
        activeNodeId: nodeId,
      } as PresencePayload);

      // Also update collaborators state to show active node
      setCollaborators((prev) =>
        prev.map((c) => (c.id === userId ? { ...c, activeNodeId: nodeId } : c))
      );
    },
    [userId, userName, userEmail, userAvatarUrl]
  );

  return {
    collaborators,
    myColor,
    isConnected,
    broadcast,
    updateCursor,
    setActiveNode,
  };
}

