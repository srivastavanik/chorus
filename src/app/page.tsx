'use client';

import { useState, useEffect } from 'react';
import Canvas from '@/components/canvas/Canvas';
import { useAuth } from '@/components/auth/AuthProvider';
import { LandingPage } from '@/components/landing/LandingPage';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { NavBar } from '@/components/layout/NavBar';
import { useCanvasStore } from '@/lib/store';
import { useSearchParams, useRouter } from 'next/navigation';

// View state type
type View = 'dashboard' | 'canvas';

function AppContent() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>('dashboard'); // Default to dashboard
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Store Actions
  const setNodes = useCanvasStore(state => state.setNodes);
  const setEdges = useCanvasStore(state => state.setEdges);
  const setSelectedNodeId = useCanvasStore(state => state.setSelectedNodeId);
  const setCanvasId = useCanvasStore(state => state.setCanvasId);

  // Handle initial load with canvasId query param
  // This MUST be before the conditional returns to comply with Rules of Hooks
  useEffect(() => {
    if (user && !loading) {
        const canvasId = searchParams.get('canvasId');
        if (canvasId) {
            handleOpenCanvas(canvasId);
        }
    }
  }, [user, loading]); 

  const handleOpenCanvas = async (id: string | null) => {
    // Clear current state first to prevent bleed-over
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setCanvasId(null); // Reset ID first

    if (id) {
      try {
        // Update URL
        router.push(`/?canvasId=${id}`, { scroll: false });

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
      // New Canvas
      router.push('/', { scroll: false });
    }
    
    setView('canvas');
  };

  const handleHomeClick = () => {
    router.push('/');
    setView('dashboard');
  };

  // If user is not logged in, show landing page
  if (!loading && !user) {
    return <LandingPage />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-black text-white">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-black text-white">
      <NavBar onHomeClick={handleHomeClick} />
      
      <main className="flex-1 overflow-hidden relative">
        {view === 'dashboard' ? (
          <Dashboard onOpenCanvas={handleOpenCanvas} />
        ) : (
          <Canvas onCanvasSelect={handleOpenCanvas} />
        )}
      </main>
    </div>
  );
}

export default function Home() {
  return <AppContent />;
}
