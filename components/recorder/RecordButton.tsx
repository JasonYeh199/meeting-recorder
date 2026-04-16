'use client';

import { Mic, Pause, Play } from 'lucide-react';
import type { RecordingState } from '@/hooks/useMediaRecorder';

interface RecordButtonProps {
  state: RecordingState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
}

export function RecordButton({ state, onStart, onPause, onResume }: RecordButtonProps) {
  const isIdle = state === 'idle';
  const isRecording = state === 'recording';
  const isPaused = state === 'paused';

  const handleClick = () => {
    if (isIdle) onStart();
    else if (isRecording) onPause();
    else onResume();
  };

  return (
    <button
      onClick={handleClick}
      aria-label={isIdle ? '開始錄音' : isRecording ? '暫停錄音' : '繼續錄音'}
      className={[
        'relative flex items-center justify-center rounded-full',
        'w-24 h-24 shadow-lg transition-all duration-300 active:scale-95',
        isIdle && 'bg-gray-200 hover:bg-gray-300',
        isRecording && 'bg-red-500 hover:bg-red-600',
        isPaused && 'bg-orange-400 hover:bg-orange-500',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Pulsing ring while recording */}
      {isRecording && (
        <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-40" />
      )}

      <span className="relative z-10 text-white">
        {isIdle && <Mic className="w-10 h-10 text-gray-500" />}
        {isRecording && <Pause className="w-10 h-10" fill="white" />}
        {isPaused && <Play className="w-10 h-10" fill="white" />}
      </span>
    </button>
  );
}
