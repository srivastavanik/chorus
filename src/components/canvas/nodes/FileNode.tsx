'use client';

import { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FileText, Image as ImageIcon, FileCode, File, Download, Eye, X } from 'lucide-react';

const getFileIcon = (fileType: string | undefined | null) => {
  if (!fileType) return File;
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
  const fileType = data.fileType as string | undefined;
  const FileIcon = getFileIcon(fileType || 'application/octet-stream');
  const isImage = fileType?.startsWith('image/');
  const isText = fileType?.includes('text') || fileType?.includes('json');
  const isPDF = fileType?.includes('pdf');

  const handleDownload = () => {
    if (data.fileData) {
      const link = document.createElement('a');
      link.href = data.fileData as string;
      link.download = (data.label as string) || 'file';
      link.click();
    }
  };

  return (
    <div className={`bg-[#0a0a0a] border rounded-2xl w-[280px] flex flex-col shadow-lg ${selected ? 'border-white' : 'border-gray-800'}`}>
      {/* Header */}
      <div className="flex items-center p-3 gap-3 bg-[#141414] cursor-grab active:cursor-grabbing drag-handle rounded-t-2xl">
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

      {/* Preview for images and PDFs */}
      {data.fileData && (
        <div className="p-2 bg-black/50 group relative" onClick={() => setShowPreview(true)}>
          {isImage ? (
            <img 
              src={data.fileData} 
              alt={data.label} 
              className="w-full rounded-lg max-h-[250px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
              draggable={false}
            />
          ) : isPDF ? (
            <div className="w-full h-[200px] bg-white rounded-lg overflow-hidden relative cursor-pointer hover:opacity-90 transition-opacity">
                {/* PDF Thumbnail - using object or iframe with interactions disabled */}
                <iframe 
                    src={`${data.fileData}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`} 
                    className="w-full h-full pointer-events-none scale-150 origin-top-left"
                    style={{ width: '66.66%', height: '66.66%' }} // Scale back down to fix resolution if needed
                    title="PDF Thumbnail"
                />
                <div className="absolute inset-0 bg-transparent" /> 
            </div>
          ) : (
            <div className="w-full h-[150px] bg-[#1e1e1e] rounded-lg flex items-center justify-center cursor-pointer hover:bg-[#252525] transition-colors">
                <FileText size={48} className="text-gray-600" />
            </div>
          )}
          
          {/* Hover Overlay Icon */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-black/60 p-2 rounded-full backdrop-blur-sm">
                <Eye size={20} className="text-white" />
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-2 border-t border-gray-800 flex items-center gap-2 nopan nodrag">
        <button 
            onClick={() => setShowPreview(true)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
        >
            <Eye size={12} />
            Preview
        </button>
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
        <div 
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-8 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) setShowPreview(false);
            }}
        >
          <button 
            className="absolute top-6 right-6 p-2 text-white bg-gray-800 hover:bg-gray-700 rounded-full transition-colors z-[210] shadow-lg border border-gray-700"
            onClick={() => setShowPreview(false)}
          >
            <X size={24} />
          </button>

          <div className="relative w-full h-full max-w-6xl max-h-[90vh] flex items-center justify-center bg-[#111] rounded-xl border border-gray-800 shadow-2xl overflow-hidden">
              {isImage && data.fileData && (
                <img 
                    src={data.fileData} 
                    alt={data.label} 
                    className="max-w-full max-h-full object-contain" 
                />
              )}
              {isText && data.fileData && (
                <div className="w-full h-full overflow-auto">
                    <pre className="p-8 text-sm font-mono text-gray-300 whitespace-pre-wrap">
                    {data.fileData.includes('base64,') ? atob(data.fileData.split(',')[1] || '') : data.fileData}
                    </pre>
                </div>
              )}
              {isPDF && data.fileData && (
                <iframe 
                    src={data.fileData} 
                    className="w-full h-full"
                    title={data.label || 'PDF Preview'}
                />
              )}
              {!isImage && !isText && !isPDF && (
                  <div className="flex flex-col items-center gap-4 text-gray-500">
                      <File size={64} />
                      <p>No preview available for this file type.</p>
                      <button onClick={handleDownload} className="px-4 py-2 bg-white text-black rounded hover:bg-gray-200 transition-colors">
                          Download to view
                      </button>
                  </div>
              )}
          </div>
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
