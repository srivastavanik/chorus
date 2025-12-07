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

export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (type: NodeType, position: XYPosition, parentId?: string) => void;
  updateNodeContent: (id: string, content: string) => void;
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
  addNode: (type, position, parentId) => {
    const id = crypto.randomUUID();
    const newNode: Node = {
      id,
      type,
      position,
      data: { label: type === 'text' ? '' : `New ${type} node` },
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

