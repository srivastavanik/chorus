'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Clock, Image as ImageIcon, FileText, ChevronRight, Search, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { useRouter } from 'next/navigation';
import { useCanvasStore } from '@/lib/store';

interface Canvas {
  id: string;
  name: string;
  updated_at: string;
  summary?: string; 
}

interface FileItem {
  name: string;
  id: string; // Storage path or ID
  size: number;
  type: string;
  created_at: string;
  url: string; // Signed URL
}

export function Dashboard({ onOpenCanvas }: { onOpenCanvas: (id: string | null) => void }) {
  const { user } = useAuth();
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // We'll use local storage for "Recent Generated Images" for this MVP
  const [recentImages, setRecentImages] = useState<{url: string, prompt: string}[]>([]);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
      // Load recent images from local storage
      const stored = localStorage.getItem('recent_images');
      if (stored) {
        try {
          setRecentImages(JSON.parse(stored).slice(0, 4)); // Top 4
        } catch (e) { console.error(e); }
      }
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [canvasesRes] = await Promise.all([
        fetch('/api/canvas'),
      ]);
      
      if (canvasesRes.ok) {
        const data = await canvasesRes.json();
        // Add mock summaries
        const enhancedData = data.map((c: any) => ({
            ...c,
            summary: generateMockSummary(c.nodes)
        }));
        setCanvases(enhancedData);
      }
      
      const filesRes = await fetch('/api/files');
      if (filesRes.ok) {
        setFiles(await filesRes.json());
      }

    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Helper to generate a mock summary based on node content
  const generateMockSummary = (nodes: any[]) => {
    if (!nodes || nodes.length === 0) return "Empty canvas";
    const textNodes = nodes.filter((n: any) => n.type === 'text');
    if (textNodes.length === 0) return "Visual exploration";
    
    // Try to find a prompt
    const firstMsg = textNodes[0]?.data?.messages?.[0]?.content;
    if (firstMsg) {
        return firstMsg.substring(0, 60) + (firstMsg.length > 60 ? "..." : "");
    }
    return "Brainstorming session";
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'
    });
  };

  const handleNewCanvas = () => {
    onOpenCanvas(null); // Create new
  };

  return (
    <div className="flex-1 overflow-y-auto bg-black p-8 no-scrollbar relative">
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      
      {/* Background Gradient Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-white/5 rounded-full blur-[120px] opacity-20" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[100px] opacity-20" />
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Left Column: Recent Canvases */}
        <div className="lg:col-span-1 space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-light text-white leading-tight tracking-tight">
              What truth(s)<br />have you been seeking?
            </h1>
            <p className="text-gray-500 text-sm font-light">Jump back into your recent explorations.</p>
          </div>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" size={16} />
            <Input 
              placeholder="Search canvases..." 
              className="pl-10 bg-white/5 border-white/10 text-gray-200 focus:border-white/20 focus:bg-white/10 transition-all rounded-xl h-10"
            />
          </div>

          <div className="space-y-2">
            <button 
                onClick={handleNewCanvas}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group text-left backdrop-blur-sm"
            >
                <div className="bg-white/10 p-2 rounded-lg text-white group-hover:scale-110 transition-transform duration-300">
                    <Plus size={20} />
                </div>
                <div>
                    <div className="font-medium text-white">New Canvas</div>
                    <div className="text-xs text-gray-500">Start a new journey</div>
                </div>
            </button>

            {loading ? (
              <div className="text-gray-500 text-sm py-4 animate-pulse">Loading...</div>
            ) : canvases.length === 0 ? (
              <div className="text-gray-500 text-sm py-4">No recent canvases found.</div>
            ) : (
              canvases.map(canvas => (
                <button 
                  key={canvas.id}
                  onClick={() => onOpenCanvas(canvas.id)}
                  className="w-full flex flex-col gap-1 p-4 rounded-xl hover:bg-white/5 transition-all group text-left border border-transparent hover:border-white/5"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                        <span className="text-sm font-medium text-gray-300 group-hover:text-white truncate max-w-[180px] transition-colors">
                        {canvas.name}
                        </span>
                    </div>
                    <span className="text-[10px] text-gray-600 font-mono">
                        {formatDate(canvas.updated_at)}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-500 pl-6 line-clamp-2 leading-relaxed group-hover:text-gray-400 transition-colors">
                    {canvas.summary}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Recent Images & Files */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section 1: Recent Generated Images */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-light text-white flex items-center gap-2 tracking-wide">
                <ImageIcon size={16} className="text-gray-400" />
                Recent Generations
              </h2>
            </div>
            
            {recentImages.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {recentImages.map((img, i) => (
                  <div key={i} className="group relative aspect-square bg-white/5 rounded-xl overflow-hidden border border-white/5 hover:border-white/20 transition-all cursor-pointer">
                    <img src={img.url} alt={img.prompt} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                        <p className="text-[10px] text-gray-200 line-clamp-3 font-light leading-relaxed">{img.prompt}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/5 rounded-xl p-8 text-center border border-white/5 border-dashed">
                <ImageIcon size={24} className="mx-auto text-gray-700 mb-3" />
                <p className="text-gray-500 text-sm">No generated images yet.</p>
                <p className="text-gray-600 text-xs mt-1 font-light">Start a chat or use the scratchpad to create.</p>
              </div>
            )}
          </section>

          {/* Section 2: Uploaded Files */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-light text-white flex items-center gap-2 tracking-wide">
                <FileText size={16} className="text-gray-400" />
                Uploaded Files
              </h2>
              {files.length > 0 && (
                <button className="text-xs text-gray-500 hover:text-white transition-colors px-2 py-1 hover:bg-white/5 rounded">
                  View All
                </button>
              )}
            </div>

            <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden backdrop-blur-sm">
              {files.length > 0 ? (
                <div className="grid grid-cols-1">
                  {files.slice(0, 5).map((file) => (
                    <div 
                        key={file.id} 
                        className="p-3 flex items-center gap-4 hover:bg-white/5 transition-all cursor-pointer group border-b border-white/5 last:border-0"
                        onClick={() => setPreviewFile(file)}
                    >
                      {/* Embedded Preview Thumbnail */}
                      <div className="w-12 h-12 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 relative group-hover:border-white/20 transition-colors">
                        {file.type.startsWith('image/') ? (
                            <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                        ) : (
                            <FileText size={20} className="text-gray-500 group-hover:text-gray-300 transition-colors" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-300 group-hover:text-white truncate transition-colors font-medium">{file.name}</div>
                        <div className="text-[10px] text-gray-600 flex items-center gap-2 mt-0.5">
                          <span>{(file.size / 1024).toFixed(1)} KB</span>
                          <span className="w-0.5 h-0.5 bg-gray-700 rounded-full" />
                          <span className="font-mono">{formatDate(file.created_at)}</span>
                        </div>
                      </div>
                      
                      <div className="p-2 text-gray-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <FileText size={24} className="mx-auto text-gray-700 mb-3" />
                  <p className="text-gray-500 text-sm">No files uploaded.</p>
                  <p className="text-gray-600 text-xs mt-1 font-light">Drag and drop files onto a canvas to upload.</p>
                </div>
              )}
            </div>
          </section>

        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div 
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-200"
            onClick={() => setPreviewFile(null)}
        >
            <button 
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
                onClick={(e) => { e.stopPropagation(); setPreviewFile(null); }}
            >
                <X size={24} />
            </button>
            
            <div 
                className="w-full max-w-5xl h-[85vh] bg-[#111] rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-white/10 bg-[#111] flex justify-between items-center">
                    <h3 className="text-white font-medium truncate">{previewFile.name}</h3>
                    <a 
                        href={previewFile.url} 
                        download 
                        className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors"
                    >
                        Download
                    </a>
                </div>
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/50">
                    {previewFile.type.startsWith('image/') ? (
                        <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full object-contain rounded-lg" />
                    ) : previewFile.type === 'application/pdf' ? (
                        <iframe src={previewFile.url} className="w-full h-full rounded-lg" />
                    ) : (
                        <div className="text-center text-gray-500">
                            <FileText size={48} className="mx-auto mb-4 opacity-50" />
                            <p>Preview not available for this file type.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
