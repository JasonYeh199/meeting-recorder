'use client';

import { Pause, Play, X } from 'lucide-react';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface Props {
  progress: number;        // 0-100
  bytesUploaded: number;
  totalBytes: number;
  state: 'uploading' | 'paused' | 'completed' | 'failed';
  error?: string | null;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

export function UploadProgress({
  progress,
  bytesUploaded,
  totalBytes,
  state,
  error,
  onPause,
  onResume,
  onCancel,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {state === 'paused'
            ? '已暫停'
            : state === 'completed'
            ? '上傳完成'
            : state === 'failed'
            ? '上傳失敗'
            : '上傳中…'}
        </span>
        <span>
          {formatBytes(bytesUploaded)} / {formatBytes(totalBytes)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={[
            'h-full rounded-full transition-all duration-300',
            state === 'failed' ? 'bg-red-500' : 'bg-indigo-500',
          ].join(' ')}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{progress}%</span>

        <div className="flex items-center gap-2">
          {state === 'uploading' && (
            <button
              onClick={onPause}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
            >
              <Pause className="w-3.5 h-3.5" />
              暫停
            </button>
          )}
          {state === 'paused' && (
            <button
              onClick={onResume}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-sm"
            >
              <Play className="w-3.5 h-3.5" />
              繼續
            </button>
          )}
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
          >
            <X className="w-3.5 h-3.5" />
            取消
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
    </div>
  );
}
