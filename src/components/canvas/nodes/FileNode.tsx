'use client';

import { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FileText, Image as ImageIcon, FileCode, File, Download, Eye, X } from 'lucide-react';

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return ImageIcon;
  if (fileType.includes('text') || fileType.includes('json') || fileType.includes('javascript') || fileType.includes('typescript')) return FileCode;
  if (fileType.includes('pdf')) return FileText;
  return File;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function FileNode({ id, data, selected }: NodeProps) {
  const [showPreview, setShowPreview] = useState(false);
  const FileIcon = getFileIcon(data.fileType || 'application/octet-stream');
  const isImage = data.fileType?.startsWith('image/');
  const isText = data.fileType?.includes('text') || data.fileType?.includes('json');

  const handleDownload = () => {
    if (data.fileData) {
      const link = document.createElement('a');
      link.href = data.fileData;
      link.download = data.label || 'file';
      link.click();
    }
  };

  return (
    <div className={`bg-[#0a0a0a] border rounded-2xl w-[280px] flex flex-col shadow-lg overflow-hidden ${selected ? 'border-white' : 'border-gray-800'}`}>
      {/* Header */}
      <div className="flex items-center p-3 gap-3 bg-[#141414] cursor-grab active:cursor-grabbing drag-handle">
        <div className="bg-gray-800 p-2 rounded-lg text-gray-400">
          <FileIcon size={24} />
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="text-sm font-medium text-white truncate" title={data.label}>
            {String(data.label || 'File')}
          </div>
          <div className="text-xs text-gray-500">
            {formatFileSize(data.fileSize || 0)}
          </div>
        </div>
      </div>

      {/* Preview for images */}
      {isImage && data.fileData && (
        <div className="p-2 bg-black/50">
          <img 
            src={data.fileData} 
            alt={data.label} 
            className="w-full rounded-lg max-h-[150px] object-cover"
            draggable={false}
          />
        </div>
      )}

      {/* Actions */}
      <div className="p-2 border-t border-gray-800 flex items-center gap-2 nopan nodrag">
        {(isImage || isText) && (
          <button 
            onClick={() => setShowPreview(true)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
          >
            <Eye size={12} />
            Preview
          </button>
        )}
        <button 
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
        >
          <Download size={12} />
          Download
        </button>
      </div>

      {/* Full preview modal */}
      {showPreview && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-8" onClick={() => setShowPreview(false)}>
          <button 
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white"
            onClick={() => setShowPreview(false)}
          >
            <X size={24} />
          </button>
          {isImage && data.fileData && (
            <img src={data.fileData} alt={data.label} className="max-w-full max-h-full rounded-lg" />
          )}
          {isText && data.fileData && (
            <pre className="bg-gray-900 p-4 rounded-lg overflow-auto max-w-full max-h-full text-sm text-gray-300">
              {atob(data.fileData.split(',')[1] || '')}
            </pre>
          )}
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
  );
}
