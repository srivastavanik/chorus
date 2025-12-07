"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Handle, Position, NodeProps, NodeResizer } from "@xyflow/react";
import {
  Trash2,
  MoreHorizontal,
  MessageSquare,
  Image as ImageIcon,
  Copy,
  Palette,
  Type,
  StickyNote,
} from "lucide-react";
import { useCanvasStore } from "@/lib/store";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useCollaborationContext } from "../CollaborationProvider";

// Preset background colors for post-its
const BG_COLORS = [
  "#ffffff", // White
  "#fef3c7", // Amber
  "#fce7f3", // Pink
  "#dbeafe", // Blue
  "#dcfce7", // Green
  "#f3e8ff", // Purple
  "#fed7aa", // Orange
  "#e5e7eb", // Gray
];

// Preset text colors
const TEXT_COLORS = [
  "#000000", // Black
  "#1f2937", // Dark gray
  "#991b1b", // Red
  "#1e40af", // Blue
  "#166534", // Green
  "#7c2d12", // Brown
  "#6b21a8", // Purple
  "#0369a1", // Cyan
];

interface PostItData {
  content?: string;
  backgroundColor?: string;
  textColor?: string;
  width?: number;
  height?: number;
}

export function PostItNode({ id, data, selected }: NodeProps) {
  const nodeData = data as PostItData;

  const [content, setContent] = useState(nodeData.content || "");
  const [bgColor, setBgColor] = useState(nodeData.backgroundColor || "#fef3c7");
  const [textColor, setTextColor] = useState(nodeData.textColor || "#000000");
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showTextPicker, setShowTextPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastBroadcastRef = useRef<number>(0);

  const updateNodeType = useCanvasStore((state) => state.updateNodeType);
  const deleteNode = useCanvasStore((state) => state.deleteNode);
  const duplicateNode = useCanvasStore((state) => state.duplicateNode);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const updateNodeDimensions = useCanvasStore(
    (state) => state.updateNodeDimensions
  );

  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const bgPickerRef = useRef<HTMLButtonElement>(null);
  const textPickerRef = useRef<HTMLButtonElement>(null);

  const moreMenuRef = useClickOutside<HTMLDivElement>(
    () => setShowMoreMenu(false),
    [moreBtnRef as React.RefObject<HTMLElement>]
  );
  const bgPickerMenuRef = useClickOutside<HTMLDivElement>(
    () => setShowBgPicker(false),
    [bgPickerRef as React.RefObject<HTMLElement>]
  );
  const textPickerMenuRef = useClickOutside<HTMLDivElement>(
    () => setShowTextPicker(false),
    [textPickerRef as React.RefObject<HTMLElement>]
  );

  // Collaboration
  const { getNodeBorderColor, broadcast } = useCollaborationContext();
  const collaboratorColor = getNodeBorderColor(id);

  // Sync content from external updates (collaboration)
  useEffect(() => {
    if (nodeData.content !== undefined && nodeData.content !== content) {
      setContent(nodeData.content);
    }
    if (nodeData.backgroundColor && nodeData.backgroundColor !== bgColor) {
      setBgColor(nodeData.backgroundColor);
    }
    if (nodeData.textColor && nodeData.textColor !== textColor) {
      setTextColor(nodeData.textColor);
    }
  }, [nodeData.content, nodeData.backgroundColor, nodeData.textColor]);

  // Broadcast content changes with debounce
  const broadcastContent = useCallback(
    (newContent: string) => {
      const now = Date.now();
      if (now - lastBroadcastRef.current > 50) {
        lastBroadcastRef.current = now;
        broadcast("node:update", {
          nodeId: id,
          updates: { content: newContent },
        });
      }
    },
    [broadcast, id]
  );

  // Handle content change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    updateNodeData(id, { content: newContent });
    broadcastContent(newContent);
  };

  // Handle background color change
  const handleBgColorChange = (color: string) => {
    setBgColor(color);
    updateNodeData(id, { backgroundColor: color });
    broadcast("node:update", {
      nodeId: id,
      updates: { backgroundColor: color },
    });
    setShowBgPicker(false);
  };

  // Handle text color change
  const handleTextColorChange = (color: string) => {
    setTextColor(color);
    updateNodeData(id, { textColor: color });
    broadcast("node:update", {
      nodeId: id,
      updates: { textColor: color },
    });
    setShowTextPicker(false);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [content]);

  return (
    <>
      <NodeResizer
        minWidth={150}
        minHeight={150}
        isVisible={selected}
        lineClassName="border-amber-500"
        handleClassName="h-3 w-3 bg-white border-2 border-amber-500 rounded"
        onResize={(_, params) => {
          updateNodeDimensions(id, params.width, params.height);
        }}
      />
      <div
        className={`rounded-lg flex flex-col shadow-lg overflow-hidden transition-all duration-200 border-2`}
        style={{
          width: nodeData.width || 200,
          height: nodeData.height || 200,
          backgroundColor: bgColor,
          borderColor:
            collaboratorColor || (selected ? "#f59e0b" : "transparent"),
          boxShadow: collaboratorColor
            ? `0 0 20px ${collaboratorColor}40, 0 0 40px ${collaboratorColor}20`
            : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-2 py-1.5 cursor-grab active:cursor-grabbing drag-handle shrink-0"
          style={{ backgroundColor: `${bgColor}dd` }}
        >
          <div
            className="flex items-center gap-1.5"
            style={{ color: textColor }}
          >
            <StickyNote size={12} />
            <span className="text-[10px] font-medium opacity-70">Note</span>
          </div>
          <div className="flex items-center gap-0.5">
            {/* Background color picker */}
            <div className="relative nodrag">
              <button
                ref={bgPickerRef}
                onClick={() => {
                  setShowBgPicker(!showBgPicker);
                  setShowTextPicker(false);
                }}
                className="p-1 rounded transition-colors hover:bg-black/10"
                title="Background color"
              >
                <Palette size={12} style={{ color: textColor }} />
              </button>
              {showBgPicker && (
                <div
                  ref={bgPickerMenuRef}
                  className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[100] p-2"
                >
                  <div className="grid grid-cols-4 gap-1.5">
                    {BG_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => handleBgColorChange(color)}
                        className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${
                          bgColor === color
                            ? "border-gray-800"
                            : "border-gray-300"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Text color picker */}
            <div className="relative nodrag">
              <button
                ref={textPickerRef}
                onClick={() => {
                  setShowTextPicker(!showTextPicker);
                  setShowBgPicker(false);
                }}
                className="p-1 rounded transition-colors hover:bg-black/10"
                title="Text color"
              >
                <Type size={12} style={{ color: textColor }} />
              </button>
              {showTextPicker && (
                <div
                  ref={textPickerMenuRef}
                  className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[100] p-2"
                >
                  <div className="grid grid-cols-4 gap-1.5">
                    {TEXT_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => handleTextColorChange(color)}
                        className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${
                          textColor === color
                            ? "border-gray-800"
                            : "border-gray-300"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* More options */}
            <div className="relative nodrag">
              <button
                ref={moreBtnRef}
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-1 rounded transition-colors hover:bg-black/10"
                title="More options"
              >
                <MoreHorizontal size={12} style={{ color: textColor }} />
              </button>

              {showMoreMenu && (
                <div
                  ref={moreMenuRef}
                  className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[100] min-w-[140px] py-1 text-left"
                >
                  <button
                    onClick={() => {
                      duplicateNode(id);
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                  >
                    <Copy size={12} /> Duplicate
                  </button>
                  <button
                    onClick={() => {
                      broadcast("node:delete", { nodeId: id });
                      deleteNode(id);
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-gray-100 transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                  <div className="border-t border-gray-200 my-1" />
                  <div className="px-3 py-1 text-[10px] text-gray-400">
                    Convert to
                  </div>
                  <button
                    onClick={() => {
                      updateNodeType(id, "text");
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                  >
                    <MessageSquare size={12} /> Text Node
                  </button>
                  <button
                    onClick={() => {
                      updateNodeType(id, "image");
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                  >
                    <ImageIcon size={12} /> Image Node
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 p-2 overflow-hidden">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            placeholder="Write a note..."
            className="w-full h-full resize-none bg-transparent border-none outline-none text-sm leading-relaxed nodrag nopan"
            style={{
              color: textColor,
              fontFamily:
                "'Inter', 'SF Pro Text', 'Segoe UI', system-ui, -apple-system, sans-serif",
              fontSize: "15px",
            }}
          />
        </div>

        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-amber-400 !border-2 !border-amber-600 hover:!bg-amber-300 hover:!scale-125 transition-all"
          style={{ left: -6 }}
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-amber-400 !border-2 !border-amber-600 hover:!bg-amber-300 hover:!scale-125 transition-all"
          style={{ right: -6 }}
        />
      </div>
    </>
  );
}
