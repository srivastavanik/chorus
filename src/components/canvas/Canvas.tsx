'use client';

import { useState, useCallback, useEffect } from 'react';
import { ReactFlow, Background, Controls, MiniMap, BackgroundVariant, useReactFlow, ReactFlowProvider } from '@xyflow/react';
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
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode } = useCanvasStore(
    useShallow((state) => ({
      nodes: state.nodes,
      edges: state.edges,
      onNodesChange: state.onNodesChange,
      onEdgesChange: state.onEdgesChange,
      onConnect: state.onConnect,
      addNode: state.addNode,
    }))
  );
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const { screenToFlowPosition, setViewport } = useReactFlow();

  // Set initial zoomed out viewport
  useEffect(() => {
    setViewport({ x: 200, y: 100, zoom: 0.75 }, { duration: 0 });
    // Animate in
    setTimeout(() => setIsReady(true), 100);
  }, [setViewport]);

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      setMenu({ x: event.clientX, y: event.clientY });
    },
    []
  );

  const onPaneClick = useCallback(() => setMenu(null), []);

  const handleAddNode = (type: NodeType) => {
    if (menu) {
      const position = screenToFlowPosition({ x: menu.x, y: menu.y });
      addNode(type, position);
      setMenu(null);
    }
  };

  return (
    <div className={`w-full h-full bg-black relative transition-opacity duration-500 ${isReady ? 'opacity-100' : 'opacity-0'}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onPaneContextMenu={onPaneContextMenu}
        onPaneClick={onPaneClick}
        className="bg-black"
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'bezier',
          animated: true,
          style: { stroke: '#404040', strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
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
        />
        <MiniMap 
          className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden" 
          nodeColor="#404040"
          maskColor="rgba(0, 0, 0, 0.7)"
          pannable
          zoomable
        />
        <Toolbar />
      </ReactFlow>
      
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
