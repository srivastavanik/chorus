'use client';

import { useState, useCallback, useEffect, useRef, DragEvent } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  BackgroundVariant, 
  useReactFlow, 
  ReactFlowProvider, 
  Node,
  OnConnectStartParams,
} from '@xyflow/react';
import { useShallow } from 'zustand/react/shallow';
import '@xyflow/react/dist/style.css';
import { useCanvasStore, NodeType } from '@/lib/store';
import { TextNode } from './nodes/TextNode';
import { ImageNode } from './nodes/ImageNode';
import { ScratchpadNode } from './nodes/ScratchpadNode';
import { FileNode } from './nodes/FileNode';
import { BezierEdge } from './edges/BezierEdge';
import { Toolbar } from './Toolbar';
import { AddBlockMenu } from './AddBlockMenu';
import { Sidebar } from './Sidebar';

const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  scratchpad: ScratchpadNode,
  file: FileNode,
};

const edgeTypes = {
  bezier: BezierEdge,
};

function CanvasContent() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, addConnectedNode, addFileNode, setSelectedNodeId } = useCanvasStore(
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
    }))
  );
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const { screenToFlowPosition, setViewport } = useReactFlow();
  const connectingNodeRef = useRef<{ nodeId: string; handleType: 'source' | 'target' } | null>(null);

  useEffect(() => {
    setViewport({ x: 300, y: 80, zoom: 0.85 }, { duration: 0 });
    setTimeout(() => setIsReady(true), 100);
  }, [setViewport]);

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
  }, [setSelectedNodeId]);

  const handleAddNode = (type: NodeType) => {
    if (menu) {
      const position = screenToFlowPosition({ x: menu.x, y: menu.y });
      addNode(type, position);
      setMenu(null);
    }
  };

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  // Track when user starts dragging from a handle
  const onConnectStart = useCallback((event: MouseEvent | TouchEvent, params: OnConnectStartParams) => {
    if (params.nodeId && params.handleType) {
      connectingNodeRef.current = {
        nodeId: params.nodeId,
        handleType: params.handleType,
      };
    }
  }, []);

  // When connection ends
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!connectingNodeRef.current) return;
      
      const targetElement = event.target as Element;
      const isPane = targetElement.classList.contains('react-flow__pane');
      
      // If dropped on empty canvas, create new connected node
      if (isPane) {
        const clientX = 'clientX' in event ? event.clientX : event.changedTouches[0].clientX;
        const clientY = 'clientY' in event ? event.clientY : event.changedTouches[0].clientY;
        const dropPosition = screenToFlowPosition({ x: clientX, y: clientY });
        
        const handlePosition = connectingNodeRef.current.handleType === 'source' ? 'right' : 'left';
        addConnectedNode(connectingNodeRef.current.nodeId, handlePosition, dropPosition);
      }
      
      connectingNodeRef.current = null;
    },
    [screenToFlowPosition, addConnectedNode]
  );

  // File drag and drop handlers
  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDraggingFile(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingFile(false);
  }, []);

  const handleDrop = useCallback(async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingFile(false);
    
    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) return;

    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    
    for (const file of files) {
      await addFileNode(file, position);
    }
  }, [screenToFlowPosition, addFileNode]);

  return (
    <div 
      className={`w-full h-full bg-black relative transition-opacity duration-300 ${isReady ? 'opacity-100' : 'opacity-0'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop zone overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-dashed border-gray-500 rounded-xl p-12 text-center">
            <p className="text-white text-lg font-medium">Drop files here</p>
            <p className="text-gray-400 text-sm mt-1">Files will be added as nodes</p>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
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
          type: 'bezier',
          style: { stroke: '#404040', strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
        fitView={false}
        connectionLineStyle={{ stroke: '#666', strokeWidth: 2 }}
        connectionLineType="bezier"
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
              case 'text': return '#fff';
              case 'image': return '#10b981'; // green-500
              case 'scratchpad': return '#8b5cf6'; // violet-500
              case 'file': return '#3b82f6'; // blue-500
              default: return '#666';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.7)"
          pannable
          zoomable
          position="bottom-right"
          style={{ zIndex: 50 }}
        />
        <Toolbar />
      </ReactFlow>
      
      <Sidebar />
      
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

export default function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  );
}
