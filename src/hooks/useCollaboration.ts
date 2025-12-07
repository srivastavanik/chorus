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
import { useCanvasStore, CanvasNode } from "@/lib/store";
import { Node, Edge } from "@xyflow/react";

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
  type:
    | "node:update"
    | "node:create"
    | "node:delete"
    | "edge:create"
    | "edge:delete"
    | "cursor"
    | "full_sync"
    | "title:update";
  userId: string;
  data: any;
  timestamp?: number; // For conflict resolution
}

const CURSOR_THROTTLE_MS = 75; // Throttle cursor updates (balanced for 5+ users)
const SYNC_INTERVAL_MS = 30000; // Sync canvas state every 30 seconds (reduced to minimize conflicts)
const LOCAL_CHANGE_GRACE_PERIOD_MS = 5000; // Don't sync from server within 5s of local changes
const NODE_GRACE_PERIOD_MS = 45000; // 45s grace period to preserve recent/local nodes

/**
 * Merge two arrays of nodes, preserving all unique nodes from both sources.
 * For nodes with the same ID, prefer the one with newer data (based on messages length or timestamp).
 */
function mergeNodes(
  localNodes: Node[],
  serverNodes: Node[],
  knownRemoteIds: Set<string>,
  pendingNodeIds: Set<string>
): Node[] {
  const nodeMap = new Map<string, Node>();

  // First, add all server nodes
  serverNodes.forEach((node) => {
    nodeMap.set(node.id, node);
  });

  // Then, merge local nodes - preserve local if:
  // 1. It doesn't exist on server (newly created locally)
  // 2. It has uploading state
  // 3. It's a known remote node (received via broadcast)
  // 4. It was created recently (within grace period)
  // 5. It's pending (received via broadcast, not yet on server)
  localNodes.forEach((localNode) => {
    const serverNode = nodeMap.get(localNode.id);
    const canvasNode = localNode as CanvasNode;

    if (!serverNode) {
      // Node only exists locally
      const isUploading = localNode.data?.uploading === true;
      const isRecent =
        canvasNode.createdAt &&
        Date.now() - canvasNode.createdAt < NODE_GRACE_PERIOD_MS;
      const isKnownRemote = knownRemoteIds.has(localNode.id);
      const isPending = pendingNodeIds.has(localNode.id);

      // Always preserve local-only nodes that are uploading, recent, known from broadcasts, or pending
      if (isUploading || isRecent || isKnownRemote || isPending) {
        nodeMap.set(localNode.id, localNode);
      }
    } else {
      // Node exists in both - merge data, preferring more complete version
      const localMessages = (localNode.data?.messages as any[]) || [];
      const serverMessages = (serverNode.data?.messages as any[]) || [];

      // Keep whichever has more messages, or local if equal (has latest user input)
      if (localMessages.length >= serverMessages.length) {
        nodeMap.set(localNode.id, {
          ...serverNode,
          ...localNode,
          data: { ...serverNode.data, ...localNode.data },
        });
      }
    }
  });

  return Array.from(nodeMap.values());
}

/**
 * Merge two arrays of edges, preserving all unique edges.
 */
function mergeEdges(
  localEdges: Edge[],
  serverEdges: Edge[],
  pendingEdgeIds: Set<string>,
  mergedNodes: Node[]
): Edge[] {
  const edgeMap = new Map<string, Edge>();

  // Add all server edges
  serverEdges.forEach((edge) => {
    edgeMap.set(edge.id, edge);
  });

  // Add local edges that don't exist on server (if pending and nodes exist)
  localEdges.forEach((edge) => {
    if (!edgeMap.has(edge.id)) {
      const isPending = pendingEdgeIds.has(edge.id);
      const sourceExists = mergedNodes.some((n) => n.id === edge.source);
      const targetExists = mergedNodes.some((n) => n.id === edge.target);

      if (isPending && sourceExists && targetExists) {
        edgeMap.set(edge.id, edge);
      } else if (!isPending) {
        // Also keep non-pending local edges (created locally)
        edgeMap.set(edge.id, edge);
      }
    }
  });

  return Array.from(edgeMap.values());
}

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

  // Track last local change time to prevent server sync from overwriting recent local changes
  const lastLocalChangeRef = useRef<number>(0);
  // Track node IDs we've seen from broadcasts to never delete them in sync
  const knownRemoteNodeIdsRef = useRef<Set<string>>(new Set());

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
            color:
              (presence.color as CollaboratorColor) || assignColor(colorIndex),
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
            // Track that we've seen this node from a remote user
            knownRemoteNodeIdsRef.current.add(data.nodeId);
            updateNodeData(data.nodeId, data.updates);
          }
          break;
        case "node:create":
          // Incremental add - merge new node into existing nodes
          if (data.node) {
            // Track this as a known remote node - NEVER delete it in sync
            knownRemoteNodeIdsRef.current.add(data.node.id);

            const currentNodes = useCanvasStore.getState().nodes;
            const exists = currentNodes.some((n) => n.id === data.node.id);
            if (!exists) {
              // Mark as pending (received via broadcast, not yet on server)
              pendingNodeIdsRef.current.add(data.node.id);
              // Add with createdAt timestamp if not present
              const nodeWithTimestamp = {
                ...data.node,
                createdAt: data.node.createdAt || Date.now(),
              };
              setNodes([...currentNodes, nodeWithTimestamp]);
              console.log("[Collab] Added node from broadcast:", data.node.id);

              // Auto-clear from pending after grace period
              setTimeout(() => {
                pendingNodeIdsRef.current.delete(data.node.id);
              }, NODE_GRACE_PERIOD_MS);
            }
          }
          // Also handle edges if provided
          if (data.edge) {
            const currentEdges = useCanvasStore.getState().edges;
            const edgeExists = currentEdges.some((e) => e.id === data.edge.id);
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
            // Remove from known remote nodes since it's explicitly deleted
            knownRemoteNodeIdsRef.current.delete(data.nodeId);

            const currentNodes = useCanvasStore.getState().nodes;
            const exists = currentNodes.some((n) => n.id === data.nodeId);
            if (exists) {
              const currentEdges = useCanvasStore.getState().edges;
              setNodes(currentNodes.filter((n) => n.id !== data.nodeId));
              setEdges(
                currentEdges.filter(
                  (e) => e.source !== data.nodeId && e.target !== data.nodeId
                )
              );
              console.log("[Collab] Deleted node from broadcast:", data.nodeId);
            }
          }
          break;
        case "full_sync":
          // Full sync - MERGE instead of replace to preserve pending local state
          if (data.nodes || data.edges) {
            const currentNodes = useCanvasStore.getState().nodes;
            const currentEdges = useCanvasStore.getState().edges;
            const incomingNodes: Node[] = data.nodes || [];
            const incomingEdges: Edge[] = data.edges || [];

            // MERGE STRATEGY: Keep all unique nodes from both sources
            const mergedNodes = mergeNodes(
              currentNodes,
              incomingNodes,
              knownRemoteNodeIdsRef.current,
              pendingNodeIdsRef.current
            );
            const mergedEdges = mergeEdges(
              currentEdges,
              incomingEdges,
              pendingEdgeIdsRef.current,
              mergedNodes
            );

            setNodes(mergedNodes);
            setEdges(mergedEdges);
            useCanvasStore.setState({
              stableCanvasState: {
                nodes: mergedNodes as CanvasNode[],
                edges: mergedEdges,
              },
            });

            // Track all incoming node IDs
            incomingNodes.forEach((n: Node) =>
              knownRemoteNodeIdsRef.current.add(n.id)
            );

            console.log("[Collab] Full sync merged:", {
              before: currentNodes.length,
              incoming: incomingNodes.length,
              after: mergedNodes.length,
            });
          }
          break;
        case "edge:create":
          // Incremental edge add
          if (data.edge) {
            const currentEdges = useCanvasStore.getState().edges;
            const exists = currentEdges.some((e) => e.id === data.edge.id);
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
            setEdges(currentEdges.filter((e) => e.id !== data.edgeId));
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
        const finalColor =
          preferredColor || assignColor(Object.keys(state).length);
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
  }, [
    canvasId,
    userId,
    userName,
    userEmail,
    userAvatarUrl,
    preferredColor,
    enabled,
    updateNodeData,
    setNodes,
    setEdges,
  ]);

  // Periodic sync interval - fetch latest canvas state from server with conflict guard
  useEffect(() => {
    if (!canvasId || !enabled || !isConnected) return;

    const syncFromServer = async () => {
      // Don't sync if there were recent local changes - wait for them to save first
      const timeSinceLastChange = Date.now() - lastLocalChangeRef.current;
      if (timeSinceLastChange < LOCAL_CHANGE_GRACE_PERIOD_MS) {
        console.log("[Collab] Skipping server sync - recent local changes");
        return;
      }

      try {
        const res = await fetch(`/api/canvas?id=${canvasId}`);
        if (res.ok) {
          const data = await res.json();
          const canvas = Array.isArray(data)
            ? data.find((c: any) => c.id === canvasId)
            : data;
          if (canvas) {
            const serverNodes: Node[] =
              typeof canvas.nodes === "string"
                ? JSON.parse(canvas.nodes)
                : canvas.nodes || [];
            const serverEdges: Edge[] =
              typeof canvas.edges === "string"
                ? JSON.parse(canvas.edges)
                : canvas.edges || [];

            const currentNodes = useCanvasStore.getState().nodes;
            const currentEdges = useCanvasStore.getState().edges;

            // Use the proper merge function that preserves all unique nodes
            const mergedNodes = mergeNodes(
              currentNodes,
              serverNodes,
              knownRemoteNodeIdsRef.current,
              pendingNodeIdsRef.current
            );
            const mergedEdges = mergeEdges(
              currentEdges,
              serverEdges,
              pendingEdgeIdsRef.current,
              mergedNodes
            );

            // Track all server node IDs as known
            serverNodes.forEach((n: Node) =>
              knownRemoteNodeIdsRef.current.add(n.id)
            );

            // Only update if there are actual differences
            const nodesChanged =
              mergedNodes.length !== currentNodes.length ||
              mergedNodes.some((n, i) => n.id !== currentNodes[i]?.id);
            const edgesChanged =
              mergedEdges.length !== currentEdges.length ||
              mergedEdges.some((e, i) => e.id !== currentEdges[i]?.id);

            if (nodesChanged || edgesChanged) {
              console.log("[Collab] Server sync merged:", {
                localNodes: currentNodes.length,
                serverNodes: serverNodes.length,
                mergedNodes: mergedNodes.length,
              });
              setNodes(mergedNodes);
              setEdges(mergedEdges);
              useCanvasStore.setState({
                stableCanvasState: {
                  nodes: mergedNodes as CanvasNode[],
                  edges: mergedEdges,
                },
              });
            }
          }
        }
      } catch (e) {
        // Silent fail - real-time should handle most updates
        console.warn("[Collab] Server sync failed:", e);
      }
    };

    // Initial sync after delay to allow broadcasts to settle (only if no recent changes)
    const initialTimeout = setTimeout(syncFromServer, 3000);

    // Periodic sync - less frequent to reduce conflicts
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

      // Track that we made a local change
      lastLocalChangeRef.current = Date.now();

      // If creating a node, track its ID
      if (type === "node:create" && data.node?.id) {
        knownRemoteNodeIdsRef.current.add(data.node.id);
      }

      channelRef.current.send({
        type: "broadcast",
        event: "canvas_update",
        payload: { type, userId, data, timestamp: Date.now() },
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
    // Get fresh state from store instead of using stale closure
    const { nodes: currentNodes, edges: currentEdges } =
      useCanvasStore.getState();
    broadcast("full_sync", { nodes: currentNodes, edges: currentEdges });
  }, [broadcast]);

  // Mark a local change (useful for external callers)
  const markLocalChange = useCallback(() => {
    lastLocalChangeRef.current = Date.now();
  }, []);

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
    markLocalChange,
    markNodePending,
    markEdgePending,
  };
}
