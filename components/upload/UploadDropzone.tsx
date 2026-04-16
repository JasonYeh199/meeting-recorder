'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Music } from 'lucide-react';

const ALLOWED_MIMES = new Set([
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/wav',
  'video/mp4',
  'audio/ogg',
  'audio/webm',
]);

const ALLOWED_EXTS = new Set(['.mp3', '.m4a', '.wav', '.mp4', '.ogg', '.webm']);
const MAX_SIZE = 500 * 1024 * 1024; // 500 MB

function validateFile(file: File): string | null {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  const mimeOk = ALLOWED_MIMES.has(file.type);
  const extOk = ALLOWED_EXTS.has(ext);

  if (!mimeOk && !extOk) {
    return `不支援 ${ext} 格式，請上傳 MP3、M4A、WAV、MP4 或 OGG`;
  }
  if (file.size > MAX_SIZE) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `檔案大小超過 500 MB 限制（您的檔案：${mb} MB）`;
  }
  return null;
}

interface Props {
  onFile: (file: File) => void;
}

export function UploadDropzone({ onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [windowDrag, setWindowDrag] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const dragCounterRef = useRef(0); // track nested drag enter/leave

  const handleFile = useCallback(
    (file: File) => {
      const err = validateFile(file);
      if (err) {
        setDragError(err);
        return;
      }
      setDragError(null);
      onFile(file);
    },
    [onFile]
  );

  // Window-level drag overlay
  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current++;
      if (dragCounterRef.current === 1) setWindowDrag(true);
    };
    const onDragLeave = () => {
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) setWindowDrag(false);
    };
    const onDragOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setWindowDrag(false);
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  const onDropZone = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      dragCounterRef.current = 0;
      setWindowDrag(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <>
      {/* Full-screen drag overlay */}
      {windowDrag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-500/20 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-3 bg-white rounded-2xl shadow-xl px-10 py-8">
            <Upload className="w-10 h-10 text-indigo-500" />
            <p className="text-lg font-semibold text-indigo-700">放開以上傳</p>
          </div>
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDropZone}
        onClick={() => inputRef.current?.click()}
        className={[
          'w-full rounded-2xl border-2 border-dashed p-10 flex flex-col items-center gap-4 cursor-pointer transition-colors select-none',
          dragOver
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/50',
        ].join(' ')}
      >
        <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center">
          <Music className="w-7 h-7 text-indigo-500" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-700">將音檔拖曳至此，或點擊選擇檔案</p>
          <p className="text-sm text-gray-400 mt-1">支援 MP3、M4A、WAV、MP4、OGG、WebM</p>
          <p className="text-xs text-gray-400 mt-0.5">單檔上限 500 MB</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/mp4,.mp3,.m4a,.wav,.mp4,.ogg,.webm"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
      </div>

      {dragError && (
        <p className="mt-2 text-sm text-red-600 text-center">{dragError}</p>
      )}
    </>
  );
}
