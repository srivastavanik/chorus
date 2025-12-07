import { create } from "zustand";
import {
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  Connection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  XYPosition,
} from "@xyflow/react";

export type NodeType = "text" | "image" | "postit" | "file";

export type CanvasNode = Node & {
  createdAt?: number;
};

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  reasoning?: string;
  timestamp?: number;
  rating?: "up" | "down" | null;
  attachments?: {
    file_id: string; // xAI file ID
    tools: { type: "file_search" | "code_interpreter" }[];
  }[];
}

export interface TextNodeData {
  messages: ChatMessage[];
  model?: string;
  webSearch?: boolean;
  reasoning?: string;
  attachedFiles?: string[];
}

export interface CanvasState {
  canvasId: string | null; // Track current canvas ID
  canvasName: string | null;
  nodes: Node[];
  edges: Edge[];
  stableCanvasState: { nodes: CanvasNode[]; edges: Edge[] } | null;
  user: any | null;
  selectedNodeId: string | null;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setUser: (user: any) => void;
  setCanvasId: (id: string | null) => void;
  setCanvasName: (name: string | null) => void;
  addNode: (
    type: NodeType,
    position?: XYPosition,
    parentId?: string,
    data?: any
  ) => string;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => string;
  addConnectedNode: (
    sourceId: string,
    sourceHandlePosition: "left" | "right",
    dropPosition?: XYPosition,
    nodeType?: NodeType
  ) => string;
  updateNodeData: (id: string, data: Partial<any>) => void;
  updateNodeContent: (id: string, content: string) => void;
  updateNodeType: (id: string, newType: NodeType) => void;
  addMessageToNode: (id: string, message: ChatMessage) => void;
  updateMessageInNode: (
    id: string,
    messageIndex: number,
    content: string,
    reasoning?: string
  ) => void;
  rateMessage: (
    nodeId: string,
    messageIndex: number,
    rating: "up" | "down" | null
  ) => void;
  splitNode: (id: string, count: number) => void;
  splitNodeWithContent: (id: string, contents: string[]) => void;
  reimagineNode: (id: string) => void;
  addFileNode: (file: File, position: XYPosition) => Promise<string>;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  updateNodeDimensions: (id: string, width: number, height?: number) => void;
  saveCanvas: (name?: string) => Promise<void>;
  ensureCanvasId: () => Promise<string | null>;

  // New State for Merge
  mergingNodeId: string | null;
  setMergingNodeId: (id: string | null) => void;
  mergeNodes: (targetId: string) => void;

}

const NODE_WIDTH = 480;
const NODE_HEIGHT = 450;
const PADDING = 100;

const findEmptyPosition = (
  nodes: Node[],
  preferredX?: number,
  preferredY?: number
): XYPosition => {
  const startX = preferredX ?? 100;
  const startY = preferredY ?? 100;

  for (let i = 0; i < 50; i++) {
    const offset = i * 40;
    const x = startX + offset;
    const y = startY + offset;

    const isOccupied = nodes.some(
      (node) =>
        Math.abs(node.position.x - x) < 40 && Math.abs(node.position.y - y) < 40
    );

    if (!isOccupied) {
      return { x, y };
    }
  }

  return {
    x: startX + Math.random() * 40 - 20,
    y: startY + Math.random() * 40 - 20,
  };
};

export const useCanvasStore = create<CanvasState>((set, get) => ({
  canvasId: null,
  canvasName: null,
  nodes: [],
  edges: [],
  stableCanvasState: null,
  user: null,
  selectedNodeId: null,
  saveStatus: "idle",
  mergingNodeId: null,
  
  setUser: (user) => set({ user }),
  setCanvasId: (id) => set({ canvasId: id }),
  setCanvasName: (name) => set({ canvasName: name }),
  setStableCanvasState: (snapshot: { nodes: CanvasNode[]; edges: Edge[] } | null) =>
    set({ stableCanvasState: snapshot }),
  setMergingNodeId: (id) => set({ mergingNodeId: id }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection: Connection) => {
    set({
      edges: addEdge({ ...connection, type: "bezier" }, get().edges),
    });
  },

  updateNodeContent: (id, content) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, label: content } }
          : node
      ),
    });
  },

  updateNodeData: (id, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              // Apply positional/size updates directly on the node when present
              ...(data.position ? { position: data.position } : {}),
              ...(data.width !== undefined ? { width: data.width } : {}),
              ...(data.height !== undefined ? { height: data.height } : {}),
              data: { ...node.data, ...data },
            }
          : node
      ),
    });
  },

  updateNodeType: (id, newType) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id !== id) return node;

        let width = 450;
        if (newType === "image") width = 400;
        if (newType === "postit") width = 200;
        if (newType === "file") width = 280;

        return {
          ...node,
          type: newType,
          width,
          data:
            newType === "text"
              ? { messages: [], label: "" }
              : { label: `${newType} node` },
        };
      }),
    });
  },

  addMessageToNode: (id, message) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id !== id) return node;
        const messages = (node.data.messages || []) as ChatMessage[];
        const newMessage: ChatMessage = { ...message, timestamp: Date.now() };
        return {
          ...node,
          data: {
            ...node.data,
            messages: [...messages, newMessage],
          },
        };
      }),
    });
  },

  updateMessageInNode: (id, messageIndex, content, reasoning) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id !== id) return node;
        const messages = [...((node.data.messages || []) as ChatMessage[])];
        if (messages[messageIndex]) {
          messages[messageIndex] = {
            ...messages[messageIndex],
            content,
            ...(reasoning !== undefined && { reasoning }),
          };
          messages.splice(messageIndex + 1);
        }
        return { ...node, data: { ...node.data, messages } };
      }),
    });
  },

  rateMessage: (nodeId, messageIndex, rating) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id !== nodeId) return node;
        const messages = [...((node.data.messages || []) as ChatMessage[])];
        if (messages[messageIndex]) {
          messages[messageIndex] = { ...messages[messageIndex], rating };
        }
        return { ...node, data: { ...node.data, messages } };
      }),
    });
  },

  splitNode: (sourceId, count) => {
    const { nodes, edges } = get();
    const sourceNode = nodes.find((n) => n.id === sourceId);
    if (!sourceNode) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const newX = sourceNode.position.x + NODE_WIDTH + 20;

    const VERTICAL_SPACING = NODE_HEIGHT + 20;

    for (let i = 0; i < count; i++) {
      const id = crypto.randomUUID();
      const targetY =
        sourceNode.position.y + (i - Math.floor(count / 2)) * VERTICAL_SPACING;
      const position = findEmptyPosition(
        [...nodes, ...newNodes],
        newX,
        targetY
      );

      newNodes.push({
        id,
        type: "text",
        position,
        width: 450,
        data: { messages: [], label: "" },
        dragHandle: ".drag-handle",
      });
      newEdges.push({
        id: `e${sourceId}-${id}`,
        source: sourceId,
        target: id,
        type: "bezier",
      });
    }

    set({
      nodes: [...nodes, ...newNodes],
      edges: [...edges, ...newEdges],
    });
  },

  splitNodeWithContent: (sourceId, contents) => {
    const { nodes, edges } = get();
    const sourceNode = nodes.find((n) => n.id === sourceId);
    if (!sourceNode) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const newX = sourceNode.position.x + NODE_WIDTH + 20;

    const VERTICAL_SPACING = NODE_HEIGHT + 20;

    for (let i = 0; i < contents.length; i++) {
      const id = crypto.randomUUID();
      const targetY =
        sourceNode.position.y +
        (i - Math.floor(contents.length / 2)) * VERTICAL_SPACING;
      const position = findEmptyPosition(
        [...nodes, ...newNodes],
        newX,
        targetY
      );

      newNodes.push({
        id,
        type: "text",
        position,
        width: 450,
        data: {
          messages: [
            { role: "user", content: contents[i], timestamp: Date.now() },
          ],
          label: contents[i].substring(0, 50),
        },
        dragHandle: ".drag-handle",
      });
      newEdges.push({
        id: `e${sourceId}-${id}`,
        source: sourceId,
        target: id,
        type: "bezier",
      });
    }

    set({
      nodes: [...nodes, ...newNodes],
      edges: [...edges, ...newEdges],
    });
  },

  reimagineNode: (sourceId) => {
    const { nodes, edges } = get();
    const sourceNode = nodes.find((n) => n.id === sourceId);
    if (!sourceNode) return;

    const id = crypto.randomUUID();
    const position = findEmptyPosition(
      nodes,
      sourceNode.position.x + NODE_WIDTH + 20,
      sourceNode.position.y
    );

    const width =
      sourceNode.width ||
      (sourceNode.type === "text"
        ? 450
        : sourceNode.type === "image"
        ? 400
        : sourceNode.type === "postit"
        ? 200
        : 280);

    // Copy node data for reimagining
    const newNode: Node = {
      id,
      type: sourceNode.type,
      position,
      width,
      data: { ...sourceNode.data, reimagined: true },
      dragHandle: ".drag-handle",
    };

    const newEdge: Edge = {
      id: `e${sourceId}-${id}`,
      source: sourceId,
      target: id,
      type: "bezier",
      style: { strokeDasharray: "5,5" },
    };

    set({
      nodes: [...nodes, newNode],
      edges: [...edges, newEdge],
    });

    return id;
  },

  addConnectedNode: (sourceId, sourceHandlePosition, dropPosition, nodeType = "text") => {
    const { nodes, edges } = get();
    const sourceNode = nodes.find((n) => n.id === sourceId);
    if (!sourceNode) return "";

    const id = crypto.randomUUID();
    let position: XYPosition;

    if (dropPosition) {
      position = findEmptyPosition(nodes, dropPosition.x, dropPosition.y);
    } else {
      const offsetX =
        sourceHandlePosition === "right" ? NODE_WIDTH + 20 : -(NODE_WIDTH + 20);
      position = findEmptyPosition(
        nodes,
        sourceNode.position.x + offsetX,
        sourceNode.position.y
      );
    }

    // Determine width and data based on node type
    let width = 450;
    let data: any = { messages: [], label: "" };
    if (nodeType === "image") {
      width = 400;
      data = { label: "Image Generation" };
    } else if (nodeType === "postit") {
      width = 200;
      data = { label: "Note", backgroundColor: "#fef3c7", textColor: "#000000" };
    } else if (nodeType === "file") {
      width = 280;
      data = { label: "File" };
    }

    const newNode: Node = {
      id,
      type: nodeType,
      position,
      width,
      data,
      dragHandle: ".drag-handle",
    };

    const newEdge: Edge = {
      id: `e${sourceId}-${id}`,
      source: sourceHandlePosition === "right" ? sourceId : id,
      target: sourceHandlePosition === "right" ? id : sourceId,
      type: "bezier",
    };

    set({
      nodes: [...nodes, newNode],
      edges: [...edges, newEdge],
    });

    return id;
  },

  addFileNode: async (file, position) => {
    const { nodes } = get();
    const id = crypto.randomUUID();
    const nodePosition = findEmptyPosition(nodes, position.x, position.y);

    const reader = new FileReader();
    const base64Preview = await new Promise<string>((resolve) => {
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    const newNode: CanvasNode = {
      id,
      type: "file",
      position: nodePosition,
      width: 280,
      data: {
        label: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileData: base64Preview,
        uploading: true,
      },
      dragHandle: ".drag-handle",
      createdAt: Date.now(),
    };

    set({ nodes: [...nodes, newNode] });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      set({
        nodes: get().nodes.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  fileData: data.url,
                  xaiFileId: data.xaiFileId,
                  uploading: false,
                  storagePath: data.path,
                },
              }
            : n
        ),
      });
    } catch (error) {
      console.error("Upload failed:", error);
      set({
        nodes: get().nodes.map((n) =>
          n.id === id
            ? {
                ...n,
                data: { ...n.data, uploading: false, error: "Upload failed" },
              }
            : n
        ),
      });
    }

    return id;
  },

  addNode: (type, position, parentId, data) => {
    const { nodes, edges } = get();
    const id = crypto.randomUUID();

    const nodePosition = position
      ? findEmptyPosition(nodes, position.x, position.y)
      : findEmptyPosition(nodes);

    const defaultData =
      type === "text"
        ? { messages: [], label: "", ...data }
        : { label: `New ${type} node`, ...data };

    let width = 450;
    if (type === "image") width = 400;
    if (type === "postit") width = 200;
    if (type === "file") width = 280;

    const newNode: CanvasNode = {
      id,
      type,
      position: nodePosition,
      width,
      data: defaultData,
      dragHandle: ".drag-handle",
      createdAt: Date.now(),
    };

    let newEdges = edges;
    if (parentId) {
      const edgeId = `e${parentId}-${id}`;
      newEdges = [
        ...edges,
        {
          id: edgeId,
          source: parentId,
          target: id,
          type: "bezier",
        },
      ];
    }

    set({ nodes: [...nodes, newNode], edges: newEdges });
    return id;
  },

  deleteNode: (id) => {
    const { nodes, edges } = get();
    set({
      nodes: nodes.filter((node) => node.id !== id),
      edges: edges.filter((edge) => edge.source !== id && edge.target !== id),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
    });
  },

  duplicateNode: (sourceId) => {
    const { nodes } = get();
    const sourceNode = nodes.find((n) => n.id === sourceId);
    if (!sourceNode) return "";

    const id = crypto.randomUUID();
    const position = findEmptyPosition(
      nodes,
      sourceNode.position.x + 50,
      sourceNode.position.y + 50
    );

    const newNode: Node = {
      ...sourceNode,
      id,
      position,
      selected: false,
      data: { ...sourceNode.data },
    };

    set({ nodes: [...nodes, newNode] });
    return id;
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  updateNodeDimensions: (id, width, height) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === id
          ? { 
              ...node, 
              width, 
              height, 
              style: { ...node.style, width, height },
              data: { ...node.data, width, height }
            }
          : node
      ),
    });
  },

  saveCanvas: async (name) => {
    const { nodes, edges, canvasId, canvasName } = get();
    set({ saveStatus: "saving" });
    try {
      // Generate ID if not present to ensure upsert works
      let id = canvasId;
      if (!id) {
        id = crypto.randomUUID();
        set({ canvasId: id });
      }

      // Sanitize nodes to remove large base64 data before saving
      const sanitizedNodes = nodes.map((node) => {
        if (node.type === "file" && node.data?.fileData && typeof node.data.fileData === "string" && node.data.fileData.startsWith("data:")) {
          // Create a shallow copy of data without the large fileData
          const { fileData, ...restData } = node.data;
          return { ...node, data: restData };
        }
        return node;
      });

      const payload: any = { id, nodes: sanitizedNodes, edges };
      // Prefer passed name, then state name, then undefined (which lets backend decide or keep existing)
      if (name) {
        payload.name = name;
        set({ canvasName: name });
      } else if (canvasName) {
        payload.name = canvasName;
      }

      const response = await fetch("/api/canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save");

      const data = await response.json();
      if (data.id && data.id !== canvasId) {
        set({ canvasId: data.id, saveStatus: "saved" });
      } else {
        set({ saveStatus: "saved" });
      }

      // Reset to idle after 2 seconds
      setTimeout(() => {
        if (get().saveStatus === "saved") {
          set({ saveStatus: "idle" });
        }
      }, 2000);
    } catch (error) {
      console.error("Save failed:", error);
      set({ saveStatus: "error" });
    }
  },

  ensureCanvasId: async () => {
    const { canvasId, saveCanvas } = get();
    if (canvasId) return canvasId;

    // Trigger save to generate and persist ID
    await saveCanvas();

    // Return the new ID
    return get().canvasId;
  },

  // Merge Implementation
  mergeNodes: (targetId) => {
    const { nodes, edges, mergingNodeId } = get();
    if (!mergingNodeId || mergingNodeId === targetId) {
      set({ mergingNodeId: null });
      return;
    }

    const sourceNode = nodes.find((n) => n.id === mergingNodeId);
    const targetNode = nodes.find((n) => n.id === targetId);

    if (!sourceNode || !targetNode) return;

    // Only merge text nodes for now
    if (sourceNode.type !== "text" || targetNode.type !== "text") {
      set({ mergingNodeId: null });
      return;
    }

    // Calculate new position (midpoint + offset)
    const newX = (sourceNode.position.x + targetNode.position.x) / 2;
    const newY =
      Math.max(sourceNode.position.y, targetNode.position.y) + NODE_HEIGHT + 50;

    const newId = crypto.randomUUID();

    const sourceMsgs = (sourceNode.data.messages || []) as ChatMessage[];
    const targetMsgs = (targetNode.data.messages || []) as ChatMessage[];

    // Sort merged messages by timestamp
    const combinedMessages = [...sourceMsgs, ...targetMsgs].sort(
      (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
    );

    // Create the new merged node
    const newNode: Node = {
      id: newId,
      type: "text",
      position: { x: newX, y: newY },
      width: 450,
      data: {
        messages: combinedMessages,
        label: "Merged Conversation",
      },
      dragHandle: ".drag-handle",
    };

    // Create edges from parents to new node
    const edge1: Edge = {
      id: `e${sourceNode.id}-${newId}`,
      source: sourceNode.id,
      target: newId,
      type: "bezier",
      animated: true,
    };

    const edge2: Edge = {
      id: `e${targetNode.id}-${newId}`,
      source: targetNode.id,
      target: newId,
      type: "bezier",
      animated: true,
    };

    set({
      nodes: [...nodes, newNode],
      edges: [...edges, edge1, edge2],
      mergingNodeId: null,
      selectedNodeId: newId,
    });
  },
}));
