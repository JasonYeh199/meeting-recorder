'use client';

import { Upload, X } from 'lucide-react';
import type { PersistedUploadState } from '@/hooks/useChunkedUpload';

interface Props {
  state: PersistedUploadState;
  onResume: () => void;
  onDismiss: () => void;
}

export function ResumeUploadBanner({ state, onResume, onDismiss }: Props) {
  const pct = Math.round((state.uploadedChunks.length / state.totalChunks) * 100);

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
      <Upload className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800">偵測到未完成的上傳</p>
        <p className="text-xs text-amber-700 mt-0.5 truncate">
          {state.filename}，已上傳 {pct}%
        </p>
        <button
          onClick={onResume}
          className="mt-2 text-xs font-semibold text-amber-700 underline underline-offset-2"
        >
          選擇相同檔案以繼續上傳
        </button>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 p-1 text-amber-400 hover:text-amber-600"
        aria-label="關閉"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
