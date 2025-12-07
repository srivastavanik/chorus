'use client';

import { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { LandingPage } from '@/components/landing/LandingPage';
import { NavBar } from '@/components/layout/NavBar';
import Canvas from '@/components/canvas/Canvas';
import { useCanvasStore } from '@/lib/store';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CanvasPage({ params }: PageProps) {
  // Unwrap params using React.use()
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [collaborators, setCollaborators] = useState<any[]>([]);

  // Store Actions
  const setNodes = useCanvasStore(state => state.setNodes);
  const setEdges = useCanvasStore(state => state.setEdges);
  const setSelectedNodeId = useCanvasStore(state => state.setSelectedNodeId);
  const setCanvasId = useCanvasStore(state => state.setCanvasId);
  const setCanvasName = useCanvasStore(state => state.setCanvasName);
  const currentCanvasId = useCanvasStore(state => state.canvasId);

  // Smart initialization: If we already have the ID in the store, don't show loading
  const storedId = useCanvasStore.getState().canvasId;
  const isAlreadyLoaded = id !== 'new' && id === storedId;
  const [isLoadingCanvas, setIsLoadingCanvas] = useState(id !== 'new' && !isAlreadyLoaded);
  
  // Track previous canvas ID to prevent premature redirects
  const prevCanvasIdRef = useRef<string | null>(currentCanvasId);

  // Hydration Effect
  useEffect(() => {
    if (!user || loading) return;

    // Optimization: If the store already has the correct canvas ID, skip fetching
    // This prevents flickering when navigating from /canvas/new to /canvas/<uuid> after autosave
    const currentStoreId = useCanvasStore.getState().canvasId;
    if (id !== 'new' && id === currentStoreId) {
      setIsLoadingCanvas(false);
      return;
    }

    let isCancelled = false;

    const loadCanvas = async () => {
      // Clear current state first
      setNodes([]);
      setEdges([]);
      setSelectedNodeId(null);
      setCanvasId(null);
      setCanvasName(null);

      if (id === 'new') {
        setIsLoadingCanvas(false);
        return;
      }

      try {
        const res = await fetch(`/api/canvas?id=${id}`);
        
        if (res.ok && !isCancelled) {
           const data = await res.json();
           const target = Array.isArray(data) ? data.find((c: any) => c.id === id) : (data.id === id ? data : null);

           if (target && !isCancelled) {
             setCanvasId(target.id);
             setCanvasName(target.name);
             const nodes = typeof target.nodes === 'string' ? JSON.parse(target.nodes) : target.nodes;
             const edges = typeof target.edges === 'string' ? JSON.parse(target.edges) : target.edges;
             
             setNodes(nodes || []);
             setEdges(edges || []);
           } else if (!isCancelled) {
             console.error("Canvas not found");
           }
        }
      } catch (e) {
        if (!isCancelled) console.error("Failed to load canvas", e);
      } finally {
        if (!isCancelled) setIsLoadingCanvas(false);
      }
    };

    loadCanvas();

    return () => {
      isCancelled = true;
    };
  }, [id, user, loading, setNodes, setEdges, setSelectedNodeId, setCanvasId]);

  // URL Update Effect for new canvases
  // Only redirect if we transitioned from null (cleared state) to a valid ID (saved state)
  useEffect(() => {
    const prevId = prevCanvasIdRef.current;
    
    if (id === 'new' && currentCanvasId && currentCanvasId !== 'new' && prevId === null) {
      router.replace(`/canvas/${currentCanvasId}`);
    }
    
    // Update ref
    prevCanvasIdRef.current = currentCanvasId;
  }, [id, currentCanvasId, router]);

  const handleHomeClick = () => {
    router.push('/');
  };

  const handleCanvasSelect = (selectedId: string | null) => {
    if (selectedId) {
      router.push(`/canvas/${selectedId}`);
    } else {
      router.push('/canvas/new');
    }
  };

  // Auth Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-black text-white">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  // Not Logged In
  if (!user) {
    return <LandingPage />;
  }

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-black text-white">
      <NavBar onHomeClick={handleHomeClick} collaborators={collaborators} />
      
      <main className="flex-1 overflow-hidden relative">
        {isLoadingCanvas ? (
           <div className="flex items-center justify-center w-full h-full">
             <div className="animate-pulse text-gray-500">Loading Canvas...</div>
           </div>
        ) : (
           <Canvas 
             onCanvasSelect={handleCanvasSelect} 
             onCollaboratorsChange={setCollaborators}
           />
        )}
      </main>
    </div>
  );
}
