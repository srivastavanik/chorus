"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import {
  Collaborator,
  CollaboratorColor,
  COLLABORATOR_COLORS,
  assignColor,
} from "@/lib/collaboration";
import { useCanvasStore } from "@/lib/store";

interface UseCollaborationOptions {
  canvasId: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userAvatarUrl: string | null;
  preferredColor?: CollaboratorColor;
  enabled?: boolean;
}

interface PresencePayload {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  color?: string;
  cursor: { x: number; y: number } | null;
  activeNodeId: string | null;
}

interface BroadcastPayload {
  type: "node:update" | "node:create" | "node:delete" | "edge:create" | "edge:delete" | "cursor" | "full_sync" | "title:update";
  userId: string;
  data: any;
}

const CURSOR_THROTTLE_MS = 75; // Throttle cursor updates (balanced for 5+ users)
const SYNC_INTERVAL_MS = 30000; // Sync canvas state every 30 seconds (reduced to minimize conflicts)
const NODE_GRACE_PERIOD_MS = 45000; // 45s grace period to preserve recent/local nodes

export function useCollaboration({
  canvasId,
  userId,
  userName,
  userEmail,
  userAvatarUrl,
  preferredColor,
  enabled = true,
}: UseCollaborationOptions) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [myColor, setMyColor] = useState<CollaboratorColor>(
    preferredColor || COLLABORATOR_COLORS[0]
  );
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastCursorUpdateRef = useRef<number>(0);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track current state for presence updates
  const currentCursorRef = useRef<{ x: number; y: number } | null>(null);
  const currentActiveNodeRef = useRef<string | null>(null);
  
  // Track nodes/edges received via broadcast (not yet confirmed by server)
  const pendingNodeIdsRef = useRef<Set<string>>(new Set());
  const pendingEdgeIdsRef = useRef<Set<string>>(new Set());

  // Store actions
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const setNodes = useCanvasStore((state) => state.setNodes);
  const setEdges = useCanvasStore((state) => state.setEdges);
  const stableCanvasState = useCanvasStore((state) => state.stableCanvasState);
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);

  // Update my color when preferredColor changes
  useEffect(() => {
    if (preferredColor) {
      setMyColor(preferredColor);
    }
  }, [preferredColor]);

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
        broadcast: {
          self: false, // Don't receive own broadcasts
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
            color: (presence.color as CollaboratorColor) || assignColor(colorIndex),
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
      console.log("[Collab] User joined:", key);
    });

    // Handle presence leave
    channel.on("presence", { event: "leave" }, ({ key }) => {
      console.log("[Collab] User left:", key);
      // We rely on the 'sync' event to update the collaborators list accurately
      // primarily because a user might have multiple tabs (presences) open.
      // The 'sync' event will fire after 'leave' with the updated state.
    });

    // Handle broadcast messages
    channel.on("broadcast", { event: "canvas_update" }, ({ payload }) => {
      const { type, userId: senderId, data } = payload as BroadcastPayload;
      
      // Ignore own broadcasts
      if (senderId === userId) return;

      console.log("[Collab] Received broadcast:", type, senderId);

      switch (type) {
        case "node:update":
          if (data.nodeId && data.updates) {
            updateNodeData(data.nodeId, data.updates);
          }
          break;
        case "node:create":
          // Incremental add - merge new node into existing nodes
          if (data.node) {
            const currentNodes = useCanvasStore.getState().nodes;
            const exists = currentNodes.some(n => n.id === data.node.id);
            if (!exists) {
              // Mark as pending (received via broadcast, not yet on server)
              pendingNodeIdsRef.current.add(data.node.id);
              // Set a local receivedAt timestamp if node doesn't have createdAt
              const nodeToAdd = data.node.createdAt 
                ? data.node 
                : { ...data.node, createdAt: Date.now() };
              setNodes([...currentNodes, nodeToAdd]);
              
              // Auto-clear from pending after grace period
              setTimeout(() => {
                pendingNodeIdsRef.current.delete(data.node.id);
              }, NODE_GRACE_PERIOD_MS);
            }
          }
          // Also handle edges if provided
          if (data.edge) {
            const currentEdges = useCanvasStore.getState().edges;
            const edgeExists = currentEdges.some(e => e.id === data.edge.id);
            if (!edgeExists) {
              pendingEdgeIdsRef.current.add(data.edge.id);
              setEdges([...currentEdges, data.edge]);
              
              setTimeout(() => {
                pendingEdgeIdsRef.current.delete(data.edge.id);
              }, NODE_GRACE_PERIOD_MS);
            }
          }
          break;
        case "node:delete":
          // Incremental delete - remove specific node
          if (data.nodeId) {
            const currentNodes = useCanvasStore.getState().nodes;
            const exists = currentNodes.some(n => n.id === data.nodeId);
            if (exists) {
              const currentEdges = useCanvasStore.getState().edges;
              setNodes(currentNodes.filter(n => n.id !== data.nodeId));
              setEdges(currentEdges.filter(e => e.source !== data.nodeId && e.target !== data.nodeId));
            }
          }
          break;
        case "full_sync":
          // Full sync - merge rather than replace to preserve pending local state
          if (data.nodes || data.edges) {
            const currentNodes = useCanvasStore.getState().nodes;
            const currentEdges = useCanvasStore.getState().edges;
            const incomingNodes = data.nodes || [];
            const incomingEdges = data.edges || [];

            // Smart merge: start with incoming, preserve pending/recent local items
            const incomingNodeIds = new Set(incomingNodes.map((n: any) => n.id));
            const mergedNodes = [...incomingNodes];
            
            currentNodes.forEach((localNode: any) => {
              if (!incomingNodeIds.has(localNode.id)) {
                const isUploading = localNode.data?.uploading === true;
                const isRecent = localNode.createdAt && (Date.now() - localNode.createdAt < NODE_GRACE_PERIOD_MS);
                const isPending = pendingNodeIdsRef.current.has(localNode.id);
                
                if (isUploading || isRecent || isPending) {
                  mergedNodes.push(localNode);
                }
              }
            });

            const incomingEdgeIds = new Set(incomingEdges.map((e: any) => e.id));
            const mergedEdges = [...incomingEdges];
            
            currentEdges.forEach((localEdge: any) => {
              if (!incomingEdgeIds.has(localEdge.id)) {
                const isPending = pendingEdgeIdsRef.current.has(localEdge.id);
                const sourceExists = mergedNodes.some((n: any) => n.id === localEdge.source);
                const targetExists = mergedNodes.some((n: any) => n.id === localEdge.target);
                
                if (isPending && sourceExists && targetExists) {
                  mergedEdges.push(localEdge);
                }
              }
            });

            setNodes(mergedNodes);
            setEdges(mergedEdges);
            useCanvasStore.setState({ stableCanvasState: { nodes: mergedNodes, edges: mergedEdges } });
          }
          break;
        case "edge:create":
          // Incremental edge add
          if (data.edge) {
            const currentEdges = useCanvasStore.getState().edges;
            const exists = currentEdges.some(e => e.id === data.edge.id);
            if (!exists) {
              pendingEdgeIdsRef.current.add(data.edge.id);
              setEdges([...currentEdges, data.edge]);
              
              setTimeout(() => {
                pendingEdgeIdsRef.current.delete(data.edge.id);
              }, NODE_GRACE_PERIOD_MS);
            }
          } else if (data.edges) {
            // Fallback for legacy broadcasts - mark all as pending
            data.edges.forEach((e: any) => pendingEdgeIdsRef.current.add(e.id));
            setEdges(data.edges);
          }
          break;
        case "edge:delete":
          if (data.edgeId) {
            const currentEdges = useCanvasStore.getState().edges;
            setEdges(currentEdges.filter(e => e.id !== data.edgeId));
          } else if (data.edges) {
            setEdges(data.edges);
          }
          break;
        case "title:update":
          // Update canvas title from collaborator
          if (data.title) {
            useCanvasStore.getState().setCanvasName(data.title);
            window.dispatchEvent(new Event("canvas-list-updated"));
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
        console.log("[Collab] Connected to channel:", channelName);
        
        // Use preferred color or assign based on count
        const state = channel.presenceState();
        const finalColor = preferredColor || assignColor(Object.keys(state).length);
        setMyColor(finalColor);

        // Track presence with color
        await channel.track({
          id: userId,
          name: userName || userEmail || "Anonymous",
          email: userEmail || "",
          avatarUrl: userAvatarUrl,
          color: finalColor,
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
  }, [canvasId, userId, userName, userEmail, userAvatarUrl, preferredColor, enabled, updateNodeData, setNodes, setEdges]);

  // Periodic sync interval - fetch latest canvas state from server with conflict guard
  useEffect(() => {
    if (!canvasId || !enabled || !isConnected) return;

    const syncFromServer = async () => {
      try {
        const res = await fetch(`/api/canvas?id=${canvasId}`);
        if (res.ok) {
          const data = await res.json();
          const canvas = Array.isArray(data) ? data.find((c: any) => c.id === canvasId) : data;
          if (canvas) {
            const serverNodes = typeof canvas.nodes === 'string' ? JSON.parse(canvas.nodes) : canvas.nodes;
            const serverEdges = typeof canvas.edges === 'string' ? JSON.parse(canvas.edges) : canvas.edges;
            
            const currentNodes = useCanvasStore.getState().nodes;
            const currentEdges = useCanvasStore.getState().edges;

            // === Smart Merge for Nodes ===
            // Start with server nodes (authoritative for existing/shared state)
            const mergedNodes = [...(serverNodes || [])];
            const serverNodeIds = new Set(mergedNodes.map((n: any) => n.id));

            // Preserve local nodes that should not be overwritten
            currentNodes.forEach((localNode: any) => {
              if (!serverNodeIds.has(localNode.id)) {
                const isUploading = localNode.data?.uploading === true;
                const isRecent = localNode.createdAt && (Date.now() - localNode.createdAt < NODE_GRACE_PERIOD_MS);
                const isPending = pendingNodeIdsRef.current.has(localNode.id);
                
                // Preserve if: uploading, recently created, or received via broadcast
                if (isUploading || isRecent || isPending) {
                  mergedNodes.push(localNode);
                }
              }
            });

            // === Smart Merge for Edges ===
            // Start with server edges
            const mergedEdges = [...(serverEdges || [])];
            const serverEdgeIds = new Set(mergedEdges.map((e: any) => e.id));

            // Preserve local edges that are pending (received via broadcast but not yet on server)
            currentEdges.forEach((localEdge: any) => {
              if (!serverEdgeIds.has(localEdge.id)) {
                const isPending = pendingEdgeIdsRef.current.has(localEdge.id);
                // Also check if both source and target nodes exist in merged nodes
                const sourceExists = mergedNodes.some((n: any) => n.id === localEdge.source);
                const targetExists = mergedNodes.some((n: any) => n.id === localEdge.target);
                
                if (isPending && sourceExists && targetExists) {
                  mergedEdges.push(localEdge);
                }
              }
            });

            setNodes(mergedNodes);
            setEdges(mergedEdges);
            useCanvasStore.setState({ stableCanvasState: { nodes: mergedNodes, edges: mergedEdges } });
          }
        }
      } catch (e) {
        // Silent fail - real-time should handle most updates
      }
    };

    // Initial sync after longer delay to allow broadcasts to settle
    const initialTimeout = setTimeout(syncFromServer, 3000);
    
    // Periodic sync (less frequent to reduce conflicts)
    syncIntervalRef.current = setInterval(syncFromServer, SYNC_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [canvasId, enabled, isConnected, setNodes, setEdges]);

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

  // Throttled cursor update
  const updateCursor = useCallback(
    (cursor: { x: number; y: number } | null) => {
      if (!channelRef.current || !userId) return;

      const now = Date.now();
      if (now - lastCursorUpdateRef.current < CURSOR_THROTTLE_MS) {
        return; // Throttle
      }
      lastCursorUpdateRef.current = now;
      currentCursorRef.current = cursor;

      // Broadcast cursor to others
      broadcast("cursor", { cursor });

      // Also update presence (preserving activeNodeId)
      channelRef.current.track({
        id: userId,
        name: userName || userEmail || "Anonymous",
        email: userEmail || "",
        avatarUrl: userAvatarUrl,
        color: myColor,
        cursor,
        activeNodeId: currentActiveNodeRef.current,
      } as PresencePayload);
    },
    [userId, userName, userEmail, userAvatarUrl, myColor, broadcast]
  );

  // Update active node (for highlighting)
  const setActiveNode = useCallback(
    (nodeId: string | null) => {
      if (!channelRef.current || !userId) return;

      currentActiveNodeRef.current = nodeId;

      channelRef.current.track({
        id: userId,
        name: userName || userEmail || "Anonymous",
        email: userEmail || "",
        avatarUrl: userAvatarUrl,
        color: myColor,
        cursor: currentCursorRef.current,
        activeNodeId: nodeId,
      } as PresencePayload);
    },
    [userId, userName, userEmail, userAvatarUrl, myColor]
  );

  // Force sync current state to all collaborators
  const forceSyncState = useCallback(() => {
    broadcast("full_sync", { nodes, edges });
  }, [broadcast, nodes, edges]);

  // Mark a node as pending (created locally, not yet confirmed by server)
  const markNodePending = useCallback((nodeId: string) => {
    pendingNodeIdsRef.current.add(nodeId);
    setTimeout(() => {
      pendingNodeIdsRef.current.delete(nodeId);
    }, NODE_GRACE_PERIOD_MS);
  }, []);

  // Mark an edge as pending
  const markEdgePending = useCallback((edgeId: string) => {
    pendingEdgeIdsRef.current.add(edgeId);
    setTimeout(() => {
      pendingEdgeIdsRef.current.delete(edgeId);
    }, NODE_GRACE_PERIOD_MS);
  }, []);

  return {
    collaborators,
    myColor,
    setMyColor,
    isConnected,
    broadcast,
    updateCursor,
    setActiveNode,
    forceSyncState,
    markNodePending,
    markEdgePending,
  };
}
