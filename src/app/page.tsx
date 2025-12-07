'use client';

import { useState, useEffect } from 'react';
import Canvas from '@/components/canvas/Canvas';
import { useAuth } from '@/components/auth/AuthProvider';
import { LandingPage } from '@/components/landing/LandingPage';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { NavBar } from '@/components/layout/NavBar';
import { useCanvasStore } from '@/lib/store';

// View state type
type View = 'dashboard' | 'canvas';

function AppContent() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>('dashboard'); // Default to dashboard
  
  // Store Actions
  const setNodes = useCanvasStore(state => state.setNodes);
  const setEdges = useCanvasStore(state => state.setEdges);
  const setSelectedNodeId = useCanvasStore(state => state.setSelectedNodeId);
  const setCanvasId = useCanvasStore(state => state.setCanvasId);

  // If user is not logged in, show landing page
  if (!loading && !user) {
    return <LandingPage />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-black text-white">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  const handleOpenCanvas = async (id: string | null) => {
    // Clear current state first to prevent bleed-over
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setCanvasId(null); // Reset ID first

    if (id) {
      try {
        // Ideally we should have a GET /api/canvas/[id] endpoint
        // But currently we list all. Let's optimize by finding in list or implementing GET by ID.
        // The current GET /api/canvas returns all.
        const res = await fetch('/api/canvas');
        if (res.ok) {
            const canvases = await res.json();
            const target = canvases.find((c: any) => c.id === id);
            if (target) {
                // Set ID first
                setCanvasId(target.id);
                // Then hydrate nodes/edges
                // Ensure we parse or use the object directly if it's JSONB
                const nodes = typeof target.nodes === 'string' ? JSON.parse(target.nodes) : target.nodes;
                const edges = typeof target.edges === 'string' ? JSON.parse(target.edges) : target.edges;
                
                setNodes(nodes || []);
                setEdges(edges || []);
            }
        }
      } catch (e) {
        console.error("Failed to load canvas", e);
      }
    } else {
      // New Canvas: State is already cleared, canvasId is null (will create new on save)
    }
    
    setView('canvas');
  };

  return (
    <div className="flex flex-col h-full w-full bg-black text-white">
      <NavBar onHomeClick={() => setView('dashboard')} />
      
      <main className="flex-1 overflow-hidden relative">
        {view === 'dashboard' ? (
          <Dashboard onOpenCanvas={handleOpenCanvas} />
        ) : (
          <Canvas />
        )}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <main className="w-screen h-screen overflow-hidden bg-black text-white">
      <AppContent />
    </main>
  );
}
