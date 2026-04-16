'use client';

import { FileAudio, X } from 'lucide-react';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatExt(file: File): string {
  const ext = file.name.split('.').pop()?.toUpperCase() ?? '';
  return ext;
}

interface Props {
  file: File;
  onRemove: () => void;
}

export function FilePreview({ file, onRemove }: Props) {
  return (
    <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl p-3">
      <div className="shrink-0 w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
        <FileAudio className="w-5 h-5 text-indigo-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatExt(file)} · {formatBytes(file.size)}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white transition-colors"
        aria-label="移除檔案"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
