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
  rating?: 'up' | 'down' | null;
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
  selectedNodeId: string | null;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (type: NodeType, position?: XYPosition, parentId?: string, data?: any) => string;
  addConnectedNode: (sourceId: string, sourceHandlePosition: 'left' | 'right', dropPosition?: XYPosition) => string;
  updateNodeData: (id: string, data: Partial<any>) => void;
  updateNodeContent: (id: string, content: string) => void;
  updateNodeType: (id: string, newType: NodeType) => void;
  addMessageToNode: (id: string, message: ChatMessage) => void;
  updateMessageInNode: (id: string, messageIndex: number, content: string) => void;
  rateMessage: (nodeId: string, messageIndex: number, rating: 'up' | 'down' | null) => void;
  splitNode: (id: string, count: number) => void;
  splitNodeWithContent: (id: string, contents: string[]) => void;
  reimagineNode: (id: string) => void;
  addFileNode: (file: File, position: XYPosition) => Promise<string>;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  saveCanvas: (name?: string) => Promise<void>;
}

const NODE_WIDTH = 480;
const NODE_HEIGHT = 450;
const PADDING = 100;

// Counter for unique positioning
let nodeCounter = 0;

// Find empty position using a grid-based approach
const findEmptyPosition = (nodes: Node[], preferredX?: number, preferredY?: number): XYPosition => {
  // If no nodes exist, return default position
  if (nodes.length === 0) {
    return { x: preferredX ?? 100, y: preferredY ?? 100 };
  }

  const startX = preferredX ?? 100;
  const startY = preferredY ?? 100;
  
  // Create a simple grid-based check
  const isOccupied = (x: number, y: number): boolean => {
    return nodes.some(node => {
      const dx = Math.abs(node.position.x - x);
      const dy = Math.abs(node.position.y - y);
      return dx < NODE_WIDTH + PADDING && dy < NODE_HEIGHT + PADDING;
    });
  };

  // First check preferred position
  if (!isOccupied(startX, startY)) {
    return { x: startX, y: startY };
  }

  // Try positions in a spiral pattern
  const directions = [
    { x: NODE_WIDTH + PADDING, y: 0 },              // right
    { x: 0, y: NODE_HEIGHT + PADDING },             // down
    { x: -(NODE_WIDTH + PADDING), y: 0 },           // left  
    { x: 0, y: -(NODE_HEIGHT + PADDING) },          // up
  ];

  for (let ring = 1; ring <= 10; ring++) {
    for (const dir of directions) {
      const testX = startX + dir.x * ring;
      const testY = startY + dir.y * ring;
      if (!isOccupied(testX, testY)) {
        return { x: testX, y: testY };
      }
    }
  }

  // Fallback: place far to the right based on counter
  nodeCounter++;
  return { 
    x: startX + (nodeCounter % 3) * (NODE_WIDTH + PADDING), 
    y: startY + Math.floor(nodeCounter / 3) * (NODE_HEIGHT + PADDING) 
  };
};

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  
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
      edges: addEdge({ ...connection, type: 'bezier' }, get().edges),
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

  updateNodeType: (id, newType) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id !== id) return node;
        return {
          ...node,
          type: newType,
          data: newType === 'text' 
            ? { messages: [], label: '' }
            : { label: `${newType} node` },
        };
      }),
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
        const messages = [...(node.data.messages || [])];
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
    const newX = sourceNode.position.x + NODE_WIDTH + PADDING;

    for (let i = 0; i < count; i++) {
      const id = crypto.randomUUID();
      const targetY = sourceNode.position.y + (i - Math.floor(count / 2)) * (NODE_HEIGHT + PADDING);
      const position = findEmptyPosition([...nodes, ...newNodes], newX, targetY);
      
      newNodes.push({
        id,
        type: 'text',
        position,
        data: { messages: [], label: '' },
        dragHandle: '.drag-handle',
      });
      newEdges.push({
        id: `e${sourceId}-${id}`,
        source: sourceId,
        target: id,
        type: 'bezier',
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
    const newX = sourceNode.position.x + NODE_WIDTH + PADDING;

    for (let i = 0; i < contents.length; i++) {
      const id = crypto.randomUUID();
      const targetY = sourceNode.position.y + (i - Math.floor(contents.length / 2)) * (NODE_HEIGHT + PADDING);
      const position = findEmptyPosition([...nodes, ...newNodes], newX, targetY);
      
      newNodes.push({
        id,
        type: 'text',
        position,
        data: { 
          messages: [{ role: 'user', content: contents[i], timestamp: Date.now() }], 
          label: contents[i].substring(0, 50) 
        },
        dragHandle: '.drag-handle',
      });
      newEdges.push({
        id: `e${sourceId}-${id}`,
        source: sourceId,
        target: id,
        type: 'bezier',
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
    const position = findEmptyPosition(nodes, sourceNode.position.x + NODE_WIDTH + PADDING, sourceNode.position.y);
    
    // Copy node data for reimagining
    const newNode: Node = {
      id,
      type: sourceNode.type,
      position,
      data: { ...sourceNode.data, reimagined: true },
      dragHandle: '.drag-handle',
    };

    const newEdge: Edge = {
      id: `e${sourceId}-${id}`,
      source: sourceId,
      target: id,
      type: 'bezier',
      style: { strokeDasharray: '5,5' }, // Dashed line for reimagine
    };

    set({
      nodes: [...nodes, newNode],
      edges: [...edges, newEdge],
    });

    return id;
  },
  
  addConnectedNode: (sourceId, sourceHandlePosition, dropPosition) => {
    const { nodes, edges } = get();
    const sourceNode = nodes.find((n) => n.id === sourceId);
    if (!sourceNode) return '';

    const id = crypto.randomUUID();
    let position: XYPosition;
    
    if (dropPosition) {
      position = findEmptyPosition(nodes, dropPosition.x, dropPosition.y);
    } else {
      const offsetX = sourceHandlePosition === 'right' ? NODE_WIDTH + PADDING : -(NODE_WIDTH + PADDING);
      position = findEmptyPosition(nodes, sourceNode.position.x + offsetX, sourceNode.position.y);
    }

    const newNode: Node = {
      id,
      type: 'text',
      position,
      data: { messages: [], label: '' },
      dragHandle: '.drag-handle',
    };

    const newEdge: Edge = {
      id: `e${sourceId}-${id}`,
      source: sourceHandlePosition === 'right' ? sourceId : id,
      target: sourceHandlePosition === 'right' ? id : sourceId,
      type: 'bezier',
    };

    set({
      nodes: [...nodes, newNode],
      edges: [...edges, newEdge],
    });

    return id;
  },

  addFileNode: async (file, position) => {
    const { nodes, edges } = get();
    const id = crypto.randomUUID();
    const nodePosition = findEmptyPosition(nodes, position.x, position.y);

    // Read file as base64 for preview
    const reader = new FileReader();
    const fileData = await new Promise<string>((resolve) => {
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    const newNode: Node = {
      id,
      type: 'file',
      position: nodePosition,
      data: { 
        label: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileData,
      },
      dragHandle: '.drag-handle',
    };

    set({ nodes: [...nodes, newNode] });
    return id;
  },
  
  addNode: (type, position, parentId, data) => {
    const { nodes, edges } = get();
    const id = crypto.randomUUID();
    
    // Calculate position - find empty space
    const nodePosition = position 
      ? findEmptyPosition(nodes, position.x, position.y)
      : findEmptyPosition(nodes);
    
    const defaultData = type === 'text' 
      ? { messages: [], label: '', ...data }
      : { label: `New ${type} node`, ...data };
    
    const newNode: Node = {
      id,
      type,
      position: nodePosition,
      data: defaultData,
      dragHandle: '.drag-handle',
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
          type: 'bezier',
        },
      ];
    }

    set({ nodes: [...nodes, newNode], edges: newEdges });
    return id;
  },
  
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  
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
