import { create } from 'zustand';
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
} from '@xyflow/react';

export type NodeType = 'text' | 'image' | 'scratchpad' | 'file';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

export interface TextNodeData {
  messages: ChatMessage[];
  model?: string;
  webSearch?: boolean;
  reasoning?: string;
}

export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (type: NodeType, position: XYPosition, parentId?: string, data?: any) => string;
  updateNodeData: (id: string, data: Partial<any>) => void;
  updateNodeContent: (id: string, content: string) => void;
  addMessageToNode: (id: string, message: ChatMessage) => void;
  updateMessageInNode: (id: string, messageIndex: number, content: string) => void;
  splitNode: (id: string, count: number) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  saveCanvas: (name?: string) => Promise<void>;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
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
      edges: addEdge({ ...connection, type: 'bezier', animated: true }, get().edges),
    });
  },
  updateNodeContent: (id, content) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, label: content } } : node
      ),
    });
  },
  updateNodeData: (id, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
      ),
    });
  },
  addMessageToNode: (id, message) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id !== id) return node;
        const messages = node.data.messages || [];
        return {
          ...node,
          data: {
            ...node.data,
            messages: [...messages, { ...message, timestamp: Date.now() }],
          },
        };
      }),
    });
  },
  updateMessageInNode: (id, messageIndex, content) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id !== id) return node;
        const messages = [...(node.data.messages || [])];
        if (messages[messageIndex]) {
          messages[messageIndex] = { ...messages[messageIndex], content };
          // Remove all messages after the edited one (for regeneration)
          messages.splice(messageIndex + 1);
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
    const spacing = 200;
    const startY = sourceNode.position.y - ((count - 1) * spacing) / 2;

    for (let i = 0; i < count; i++) {
      const id = crypto.randomUUID();
      newNodes.push({
        id,
        type: 'text',
        position: {
          x: sourceNode.position.x + 500,
          y: startY + i * spacing,
        },
        data: { messages: [], label: '' },
      });
      newEdges.push({
        id: `e${sourceId}-${id}`,
        source: sourceId,
        target: id,
        type: 'bezier',
        animated: true,
      });
    }

    set({
      nodes: [...nodes, ...newNodes],
      edges: [...edges, ...newEdges],
    });
  },
  addNode: (type, position, parentId, data) => {
    const id = crypto.randomUUID();
    const defaultData = type === 'text' 
      ? { messages: [], label: '', ...data }
      : { label: `New ${type} node`, ...data };
    
    const newNode: Node = {
      id,
      type,
      position,
      data: defaultData,
    };

    set((state) => {
      const newNodes = [...state.nodes, newNode];
      let newEdges = state.edges;

      if (parentId) {
        const edgeId = `e${parentId}-${id}`;
        newEdges = [
          ...newEdges,
          {
            id: edgeId,
            source: parentId,
            target: id,
            type: 'bezier',
            animated: true,
          },
        ];
      }

      return { nodes: newNodes, edges: newEdges };
    });
    
    return id;
  },
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  saveCanvas: async (name) => {
    const { nodes, edges } = get();
    try {
      const response = await fetch('/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, nodes, edges }),
      });
      if (!response.ok) throw new Error('Failed to save');
    } catch (error) {
      console.error('Save failed:', error);
    }
  },
}));
