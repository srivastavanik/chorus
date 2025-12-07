"use client";

import { useState, useCallback, useEffect, useRef, DragEvent } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ConnectionLineType,
  useReactFlow,
  ReactFlowProvider,
  Node,
  OnConnectStartParams,
} from "@xyflow/react";
import { useShallow } from "zustand/react/shallow";
import "@xyflow/react/dist/style.css";
import { useCanvasStore, NodeType } from "@/lib/store";
import { TextNode } from "./nodes/TextNode";
import { ImageNode } from "./nodes/ImageNode";
import { ScratchpadNode } from "./nodes/ScratchpadNode";
import { FileNode } from "./nodes/FileNode";
import { BezierEdge } from "./edges/BezierEdge";
import { Toolbar } from "./Toolbar";
import { AddBlockMenu } from "./AddBlockMenu";
import { Sidebar } from "./Sidebar";
import { AutosaveStatus } from "./AutosaveStatus";
import { CollaborationProvider, useCollaborationContext } from "./CollaborationProvider";
import { useAutoVersioning } from "@/hooks/useAutoVersioning";

const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  scratchpad: ScratchpadNode,
  file: FileNode,
};

const edgeTypes = {
  bezier: BezierEdge,
};

interface CanvasContentProps {
  onCanvasSelect?: (id: string | null) => void;
  onCollaboratorsChange?: (collaborators: any[]) => void;
}

function CanvasContentInner({ onCanvasSelect, onCollaboratorsChange }: CanvasContentProps) {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    addConnectedNode,
    addFileNode,
    setSelectedNodeId,
    saveCanvas,
    user,
  } = useCanvasStore(
    useShallow((state) => ({
      nodes: state.nodes,
      edges: state.edges,
      onNodesChange: state.onNodesChange,
      onEdgesChange: state.onEdgesChange,
      onConnect: state.onConnect,
      addNode: state.addNode,
      addConnectedNode: state.addConnectedNode,
      addFileNode: state.addFileNode,
      setSelectedNodeId: state.setSelectedNodeId,
      saveCanvas: state.saveCanvas,
      user: state.user,
    }))
  );

  const { collaborators, broadcast, setActiveNode, updateCursor } = useCollaborationContext();

  // Get canvas ID for auto-versioning
  const canvasId = useCanvasStore((state) => state.canvasId);
  
  // Auto-version every 5 minutes when changes detected
  useAutoVersioning(canvasId, !!user);

  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const { screenToFlowPosition, setViewport } = useReactFlow();
  const connectingNodeRef = useRef<{
    nodeId: string;
    handleType: "source" | "target";
  } | null>(null);

  // Ref to track if we've initialized the default node
  const hasInitializedDefaultNode = useRef(false);

  // Notify parent of collaborator changes
  useEffect(() => {
    if (onCollaboratorsChange) {
      onCollaboratorsChange(collaborators);
    }
  }, [collaborators, onCollaboratorsChange]);

  // Auto-save effect
  useEffect(() => {
    if (!isReady || !user) return;

    const timeout = setTimeout(() => {
      saveCanvas();
    }, 2000); // Debounce 2s

    return () => clearTimeout(timeout);
  }, [nodes, edges, isReady, user, saveCanvas]);

  useEffect(() => {
    setViewport({ x: 300, y: 80, zoom: 0.85 }, { duration: 0 });
    setTimeout(() => setIsReady(true), 100);
  }, [setViewport]);

  // Initialize with default text node if empty
  useEffect(() => {
    if (isReady && !hasInitializedDefaultNode.current) {
      if (nodes.length === 0) {
        addNode("text");
      }
      hasInitializedDefaultNode.current = true;
    }
  }, [isReady, addNode, nodes.length]);

  // Broadcast node changes
  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      
      // Broadcast significant changes
      changes.forEach((change) => {
        if (change.type === "position" && "position" in change && change.position) {
          broadcast("node:update", {
            nodeId: change.id,
            updates: { position: change.position },
          });
        }
      });
    },
    [onNodesChange, broadcast]
  );

  // Broadcast edge changes
  const handleEdgesChange: typeof onEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      
      const store = useCanvasStore.getState();
      changes.forEach((change) => {
        if (change.type === "add" || change.type === "remove") {
          broadcast("edge:create", { edges: store.edges });
        }
      });
    },
    [onEdgesChange, broadcast]
  );

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      setMenu({ x: event.clientX, y: event.clientY });
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setMenu(null);
    setSelectedNodeId(null);
    setActiveNode(null);
  }, [setSelectedNodeId, setActiveNode]);

  const handleAddNode = (type: NodeType) => {
    if (menu) {
      const position = screenToFlowPosition({ x: menu.x, y: menu.y });
      addNode(type, position);
      setMenu(null);
      
      // Broadcast node creation
      const store = useCanvasStore.getState();
      broadcast("node:create", { nodes: store.nodes });
    }
  };

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
      setActiveNode(node.id);
    },
    [setSelectedNodeId, setActiveNode]
  );

  // Track when user starts dragging from a handle
  const onConnectStart = useCallback(
    (event: MouseEvent | TouchEvent, params: OnConnectStartParams) => {
      if (params.nodeId && params.handleType) {
        connectingNodeRef.current = {
          nodeId: params.nodeId,
          handleType: params.handleType,
        };
      }
    },
    []
  );

  // When connection ends
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!connectingNodeRef.current) return;

      const targetElement = event.target as Element;
      const isPane = targetElement.classList.contains("react-flow__pane");

      // If dropped on empty canvas, create new connected node
      if (isPane) {
        const clientX =
          "clientX" in event ? event.clientX : event.changedTouches[0].clientX;
        const clientY =
          "clientY" in event ? event.clientY : event.changedTouches[0].clientY;
        const dropPosition = screenToFlowPosition({ x: clientX, y: clientY });

        const handlePosition =
          connectingNodeRef.current.handleType === "source" ? "right" : "left";
        addConnectedNode(
          connectingNodeRef.current.nodeId,
          handlePosition,
          dropPosition
        );
        
        // Broadcast node creation
        setTimeout(() => {
          const store = useCanvasStore.getState();
          broadcast("node:create", { nodes: store.nodes, edges: store.edges });
        }, 0);
      }

      connectingNodeRef.current = null;
    },
    [screenToFlowPosition, addConnectedNode, broadcast]
  );

  // File drag and drop handlers
  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDraggingFile(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingFile(false);
  }, []);

  const handleDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDraggingFile(false);

      const files = Array.from(event.dataTransfer.files);
      if (files.length === 0) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      for (const file of files) {
        await addFileNode(file, position);
      }
      
      // Broadcast node creation
      const store = useCanvasStore.getState();
      broadcast("node:create", { nodes: store.nodes });
    },
    [screenToFlowPosition, addFileNode, broadcast]
  );

  // Mouse move for cursor tracking
  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      updateCursor(position);
    },
    [screenToFlowPosition, updateCursor]
  );

  return (
    <div
      className={`w-full h-full bg-black relative transition-opacity duration-300 ${
        isReady ? "opacity-100" : "opacity-0"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseMove={handleMouseMove}
    >
      {/* Drop zone overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-dashed border-gray-500 rounded-xl p-12 text-center">
            <p className="text-white text-lg font-medium">Drop files here</p>
            <p className="text-gray-400 text-sm mt-1">
              Files will be added as nodes
            </p>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onPaneContextMenu={onPaneContextMenu}
        onPaneClick={onPaneClick}
        className="bg-black"
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        panOnDrag={true}
        selectionOnDrag={false}
        defaultEdgeOptions={{
          type: "bezier",
          style: { stroke: "#404040", strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
        fitView={false}
        connectionLineStyle={{ stroke: "#666", strokeWidth: 2 }}
        connectionLineType={ConnectionLineType.Bezier}
      >
        <Background
          color="#333"
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
        />
        <Controls
          className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden"
          showInteractive={false}
          style={{ zIndex: 50 }}
        />
        <MiniMap
          className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden"
          nodeColor={(node) => {
            switch (node.type) {
              case "text":
                return "#fff";
              case "image":
                return "#10b981"; // green-500
              case "scratchpad":
                return "#8b5cf6"; // violet-500
              case "file":
                return "#3b82f6"; // blue-500
              default:
                return "#666";
            }
          }}
          maskColor="rgba(0, 0, 0, 0.7)"
          pannable
          zoomable
          position="bottom-right"
          style={{ zIndex: 50 }}
        />
        <Toolbar />
        
        {/* Collaborator cursors */}
        {collaborators.map((collab) =>
          collab.cursor ? (
            <CollaboratorCursor
              key={collab.id}
              name={collab.name}
              color={collab.color}
              x={collab.cursor.x}
              y={collab.cursor.y}
            />
          ) : null
        )}
      </ReactFlow>

      <AutosaveStatus />
      <Sidebar onCanvasSelect={onCanvasSelect} />

      {menu && (
        <AddBlockMenu
          position={menu}
          onSelect={handleAddNode}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}

// Collaborator cursor component
function CollaboratorCursor({
  name,
  color,
  x,
  y,
}: {
  name: string;
  color: string;
  x: number;
  y: number;
}) {
  return (
    <div
      className="absolute pointer-events-none z-[1000] transition-all duration-75"
      style={{
        transform: `translate(${x}px, ${y}px)`,
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill={color}
        className="drop-shadow-lg"
      >
        <path d="M5.65376 12.456L1.5 3.2C1.5 3.2 12.9 8.9 21.5 3.2L5.65376 12.456Z" />
        <path d="M5.65376 12.456L9 20.9L12.3462 12.456H5.65376Z" />
      </svg>
      <span
        className="absolute left-4 top-4 px-2 py-0.5 text-[10px] text-white rounded-full whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        {name}
      </span>
    </div>
  );
}

function CanvasContent(props: CanvasContentProps) {
  return (
    <CollaborationProvider>
      <CanvasContentInner {...props} />
    </CollaborationProvider>
  );
}

export default function Canvas({
  onCanvasSelect,
  onCollaboratorsChange,
}: {
  onCanvasSelect?: (id: string | null) => void;
  onCollaboratorsChange?: (collaborators: any[]) => void;
}) {
  return (
    <ReactFlowProvider>
      <CanvasContent onCanvasSelect={onCanvasSelect} onCollaboratorsChange={onCollaboratorsChange} />
    </ReactFlowProvider>
  );
}
