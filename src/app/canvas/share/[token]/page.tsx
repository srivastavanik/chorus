'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { NavBar } from '@/components/layout/NavBar';
import Canvas from '@/components/canvas/Canvas';
import { useCanvasStore } from '@/lib/store';

interface PageProps {
  params: Promise<{ token: string }>;
}

interface ShareData {
  canvas: {
    id: string;
    name: string;
    nodes: any;
    edges: any;
  };
  share: {
    permission: 'view' | 'edit';
    isPublic: boolean;
  };
  isOwner: boolean;
  canEdit: boolean;
}

export default function SharedCanvasPage({ params }: PageProps) {
  const { token } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [collaborators, setCollaborators] = useState<any[]>([]);

  const setNodes = useCanvasStore(state => state.setNodes);
  const setEdges = useCanvasStore(state => state.setEdges);
  const setSelectedNodeId = useCanvasStore(state => state.setSelectedNodeId);
  const setCanvasId = useCanvasStore(state => state.setCanvasId);
  const setCanvasName = useCanvasStore(state => state.setCanvasName);

  useEffect(() => {
    let isCancelled = false;

    const loadSharedCanvas = async () => {
      try {
        const res = await fetch(`/api/canvas/shared?token=${token}`);
        const data = await res.json();

        if (!res.ok) {
          if (!isCancelled) setError(data.error || 'Failed to load canvas');
          return;
        }

        if (!isCancelled) {
          setShareData(data);
          
          // Load canvas data into store
          setCanvasId(data.canvas.id);
          setCanvasName(data.canvas.name);
          
          const nodes = typeof data.canvas.nodes === 'string' 
            ? JSON.parse(data.canvas.nodes) 
            : data.canvas.nodes;
          const edges = typeof data.canvas.edges === 'string' 
            ? JSON.parse(data.canvas.edges) 
            : data.canvas.edges;
          
          setNodes(nodes || []);
          setEdges(edges || []);
          setSelectedNodeId(null);
        }
      } catch (e) {
        if (!isCancelled) setError('Failed to load canvas');
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    loadSharedCanvas();

    return () => {
      isCancelled = true;
    };
  }, [token, setNodes, setEdges, setSelectedNodeId, setCanvasId, setCanvasName]);

  const handleHomeClick = () => {
    router.push('/');
  };

  const handleCanvasSelect = (selectedId: string | null) => {
    if (user) {
      if (selectedId) {
        router.push(`/canvas/${selectedId}`);
      } else {
        router.push('/canvas/new');
      }
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-black text-white">
        <div className="animate-pulse">Loading shared canvas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center w-screen h-screen bg-black text-white">
        <div className="text-red-400 mb-4">{error}</div>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-sm"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-black text-white">
      <NavBar onHomeClick={handleHomeClick} collaborators={collaborators} />
      
      {/* View-only banner */}
      {shareData && !shareData.canEdit && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 flex items-center justify-center gap-2">
          <span className="text-xs text-yellow-400 font-mono">
            VIEW ONLY - You can view this canvas but cannot make changes
          </span>
        </div>
      )}
      
      <main className="flex-1 overflow-hidden relative">
        <Canvas 
          onCanvasSelect={handleCanvasSelect} 
          onCollaboratorsChange={setCollaborators}
        />
      </main>
    </div>
  );
}
