import { Handle, Position, NodeProps } from '@xyflow/react';
import { FileText } from 'lucide-react';

export function FileNode({ data }: NodeProps) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl w-[240px] flex items-center p-3 gap-3 shadow-lg hover:border-gray-600 transition-colors">
      <div className="bg-gray-800 p-2 rounded-lg text-blue-400">
        <FileText size={24} />
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="text-sm font-medium text-white truncate">{String(data.label || 'Document.pdf')}</div>
        <div className="text-xs text-gray-500">Uploaded File</div>
      </div>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-gray-600 border-2 border-gray-900" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-gray-600 border-2 border-gray-900" />
    </div>
  );
}

