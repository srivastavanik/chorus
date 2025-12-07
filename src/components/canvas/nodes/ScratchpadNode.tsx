"use client";

import { useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps, NodeResizer } from "@xyflow/react";
import {
  Pencil,
  Eraser,
  Trash2,
  Wand2,
  Loader2,
  Download,
  MoreHorizontal,
  MessageSquare,
  Image as ImageIcon,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCanvasStore } from "@/lib/store";
import { useClickOutside } from "@/hooks/useClickOutside";

export function ScratchpadNode({ id, data, selected }: NodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<"pencil" | "eraser">("pencil");
  const [brushSize, setBrushSize] = useState(2);
  const [showGenerate, setShowGenerate] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  // We initialize from data.generatedImage if present, though we primarily use the canvas for sketches
  const [generatedImage, setGeneratedImage] = useState<string | null>(
    typeof data.generatedImage === 'string' ? data.generatedImage : null
  );
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const updateNodeType = useCanvasStore((state) => state.updateNodeType);
  const deleteNode = useCanvasStore((state) => state.deleteNode);
  const duplicateNode = useCanvasStore((state) => state.duplicateNode);
  const addConnectedNode = useCanvasStore((state) => state.addConnectedNode);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);

  // Update store dimensions on resize
  const updateNodeDimensions = useCanvasStore(
    (state) => state.updateNodeDimensions
  );

  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useClickOutside<HTMLDivElement>(
    () => setShowMoreMenu(false),
    [moreBtnRef as React.RefObject<HTMLElement>]
  );

  // Initial size from data or default
  const [size, setSize] = useState({
    width: data.width || 352,
    height: data.height || 450,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize with white background
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load existing sketch if present
    if (typeof data.generatedImage === 'string' && data.generatedImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = data.generatedImage;
    }
  }, []);

  const syncCanvasToNodeData = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    updateNodeData(id, {
      generatedImage: dataUrl,
      label: "Scratchpad sketch",
    });
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY =
      "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    syncCanvasToNodeData();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = tool === "eraser" ? brushSize * 5 : brushSize;
    ctx.strokeStyle = tool === "eraser" ? "#FFFFFF" : "#000000";

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setGeneratedImage(null);
    updateNodeData(id, { generatedImage: null, label: undefined });
  };

  const getCanvasDataUrl = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL("image/png");
  };

  const scheduleAutoTitle = async (sourcePrompt: string) => {
    try {
      const { ensureCanvasId, setCanvasName } = useCanvasStore.getState();
      const canvasId = await ensureCanvasId();

      if (!canvasId) return;

      // Fire and forget
      fetch("/api/canvas/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvasId, prompt: sourcePrompt }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.updated) {
            if (data.title) {
              setCanvasName(data.title);
            }
            window.dispatchEvent(new Event("canvas-list-updated"));
          }
        })
        .catch((err) => console.error("Auto-title failed:", err));
    } catch (e) {
      console.error("Auto-title scheduling failed:", e);
    }
  };

  const handleGenerateFromSketch = async () => {
    if (!prompt.trim()) return;

    const sketchDataUrl = getCanvasDataUrl();
    if (!sketchDataUrl) return;

    // Gather text context from connected TextNodes (check BOTH directions)
    const { nodes, edges } = useCanvasStore.getState();
    const incomingEdges = edges.filter(e => e.target === id);
    const outgoingEdges = edges.filter(e => e.source === id);
    
    // Get nodes connected via incoming edges (source nodes)
    const incomingNodes = incomingEdges
      .map(e => nodes.find(n => n.id === e.source))
      .filter(Boolean);
    
    // Get nodes connected via outgoing edges (target nodes)
    const outgoingNodes = outgoingEdges
      .map(e => nodes.find(n => n.id === e.target))
      .filter(Boolean);
    
    // Combine all connected nodes (dedupe)
    const connectedNodeIds = new Set<string>();
    const connectedNodes = [...incomingNodes, ...outgoingNodes].filter(node => {
      if (!node || connectedNodeIds.has(node.id)) return false;
      connectedNodeIds.add(node.id);
      return true;
    });

    const textContextParts: string[] = [];
    connectedNodes.forEach(node => {
      if (node?.type === 'text' && node.data?.messages) {
        const messages = node.data.messages as Array<{ role: string; content: string }>;
        const recentMessages = messages.slice(-4);
        const contextText = recentMessages
          .map(m => `${m.role}: ${m.content}`)
          .join('\n');
        if (contextText) {
          textContextParts.push(contextText);
        }
      }
    });

    // Build enhanced prompt with context
    let enhancedPrompt = prompt;
    if (textContextParts.length > 0) {
      enhancedPrompt = `Context from conversation:\n${textContextParts.join('\n---\n')}\n\nImage request: ${prompt}`;
    }

    // Trigger auto-title
    if (prompt.trim()) {
      scheduleAutoTitle(prompt);
    }

    setIsGenerating(true);

    try {
      // Create a new Image Node connected to this one
      // We can't easily get the new ID from here without async wait or store update
      // but addConnectedNode returns the ID!
      const newNodeId = addConnectedNode(id, "right");

      if (newNodeId) {
        // Update the new node with loading state and prompt
        updateNodeData(newNodeId, {
          isGenerating: true,
          prompt: prompt,
          editImage: sketchDataUrl, // Pass the sketch as source
          mode: "edit", // Set mode to edit
        });

        // Now call API
        const response = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: enhancedPrompt,
            editImage: sketchDataUrl,
            model: "grok-imagine-v0p9",
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to generate: ${errorText}`);
        }

        const result = await response.json();
        if (result.data?.[0]?.url) {
          // Update the new node with the result
          updateNodeData(newNodeId, {
            isGenerating: false,
            images: [
              {
                url: result.data[0].url,
                revisedPrompt: result.data[0].revised_prompt,
              },
            ],
            selectedImageIndex: 0,
          });
        } else {
          updateNodeData(newNodeId, {
            isGenerating: false,
            error: "No image returned",
          });
        }
      }
    } catch (err) {
      console.error("Generation failed:", err);
      // We should probably update the connected node with error state if we created it
      // But we don't have easy access to it here if we didn't save the ID or if it failed before creation
    } finally {
      setIsGenerating(false);
      setShowGenerate(false); // Close the generation panel
      setPrompt("");
    }
  };

  const handleDownload = () => {
    const dataUrl = generatedImage || getCanvasDataUrl();
    if (dataUrl) {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `sketch-${Date.now()}.png`;
      link.click();
    }
  };

  return (
    <>
      <NodeResizer
        minWidth={300}
        minHeight={300}
        isVisible={selected}
        lineClassName="border-purple-500"
        handleClassName="h-3 w-3 bg-white border-2 border-purple-500 rounded"
        onResize={(_, params) => {
          setSize({ width: params.width, height: params.height });
          updateNodeDimensions(id, params.width, params.height);
        }}
      />
      <div
        className={`bg-white border rounded-xl flex flex-col shadow-lg overflow-hidden ${
          selected ? "border-gray-400" : "border-gray-200"
        }`}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 cursor-grab active:cursor-grabbing drag-handle shrink-0">
          <div className="flex items-center gap-2 text-gray-600">
            <Pencil size={14} />
            <span className="text-xs font-medium">Scratchpad</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTool("pencil")}
              className={`p-1.5 rounded-md transition-colors nodrag ${
                tool === "pencil"
                  ? "bg-white text-black"
                  : "text-gray-500 hover:bg-gray-800"
              }`}
              title="Pencil tool"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => setTool("eraser")}
              className={`p-1.5 rounded-md transition-colors nodrag ${
                tool === "eraser"
                  ? "bg-white text-black"
                  : "text-gray-500 hover:bg-gray-800"
              }`}
              title="Eraser tool"
            >
              <Eraser size={14} />
            </button>
            <div className="w-px h-4 bg-gray-700 mx-1" />
            <button
              onClick={() => setShowGenerate(!showGenerate)}
              className={`p-1.5 rounded-md transition-colors nodrag ${
                showGenerate
                  ? "bg-purple-600 text-white"
                  : "text-gray-500 hover:bg-gray-800 hover:text-purple-400"
              }`}
              title="Generate from sketch"
            >
              <Wand2 size={14} />
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-md transition-colors nodrag"
              title="Download"
            >
              <Download size={14} />
            </button>
            <button
              onClick={clearCanvas}
              className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-md transition-colors nodrag"
              title="Clear canvas"
            >
              <Trash2 size={14} />
            </button>

            <div className="relative nodrag">
              <button
                ref={moreBtnRef}
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-md transition-colors nodrag"
                title="More options"
              >
                <MoreHorizontal size={14} />
              </button>

              {showMoreMenu && (
                <div
                  ref={moreMenuRef}
                  className="absolute top-full right-0 mt-1 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl z-[100] min-w-[160px] py-1 text-left"
                >
                  <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-800">
                    Actions
                  </div>
                  <button
                    onClick={() => {
                      duplicateNode(id);
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <Copy size={14} /> Duplicate
                  </button>
                  <button
                    onClick={() => {
                      deleteNode(id);
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors flex items-center gap-2 border-b border-gray-800"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                  <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-800">
                    Convert to
                  </div>
                  <button
                    onClick={() => {
                      updateNodeType(id, "text");
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <MessageSquare size={14} /> Text Node
                  </button>
                  <button
                    onClick={() => {
                      updateNodeType(id, "image");
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <ImageIcon size={14} /> Image Node
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Brush size */}
        <div className="px-3 py-2 border-b border-gray-700 flex items-center gap-2 nopan nodrag shrink-0 bg-white">
          <span className="text-xs text-gray-500">Size:</span>
          <input
            type="range"
            min="1"
            max="10"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs text-gray-400 w-4">{brushSize}</span>
        </div>

        {/* Canvas or Generated Image */}
        <div className="flex-1 bg-white relative nopan nodrag overflow-hidden relative">
          {generatedImage ? (
            <img
              src={generatedImage}
              alt="Generated"
              className="w-full h-full object-contain"
              draggable={false}
            />
          ) : (
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair touch-none"
              width={1024}
              height={1024}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          )}
        </div>

        {/* Generate from sketch */}
        {showGenerate && (
          <div className="p-3 border-t border-gray-700 nopan nodrag shrink-0 bg-white">
            <div className="flex gap-2">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && handleGenerateFromSketch()
                }
                placeholder="Describe the image..."
                className="bg-[#252525] border-gray-600 text-xs text-white"
                disabled={isGenerating}
              />
              <Button
                size="icon"
                onClick={handleGenerateFromSketch}
                disabled={isGenerating || !prompt.trim()}
                className="h-9 w-9"
              >
                {isGenerating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Wand2 size={16} />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-gray-600 mt-1">
              Your sketch will be used as a reference for generation
            </p>
          </div>
        )}

        <Handle
          type="target"
          position={Position.Left}
          className="!w-4 !h-4 !bg-gray-500 !border-2 !border-gray-800 hover:!bg-white hover:!scale-125 transition-all"
          style={{ left: -8 }}
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!w-4 !h-4 !bg-gray-500 !border-2 !border-gray-800 hover:!bg-white hover:!scale-125 transition-all"
          style={{ right: -8 }}
        />
      </div>
    </>
  );
}
