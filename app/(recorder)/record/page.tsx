'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Square } from 'lucide-react';
import { useMediaRecorder } from '@/hooks/useMediaRecorder';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { RecordButton } from '@/components/recorder/RecordButton';
import { AudioWaveform } from '@/components/recorder/AudioWaveform';
import { RecordingTimer } from '@/components/recorder/RecordingTimer';

const MEETING_TYPES = [
  { value: 'broker_seminar', label: '券商座談' },
  { value: 'company_visit', label: '拜訪公司' },
  { value: 'earnings_call', label: '法說會' },
  { value: 'other', label: '其他' },
] as const;

type MeetingType = (typeof MEETING_TYPES)[number]['value'];

export default function RecordPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [type, setType] = useState<MeetingType>('broker_seminar');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { enqueue } = useOfflineQueue();

  const handleStop = useCallback(
    async (blob: Blob, durationSeconds: number) => {
      if (!title.trim()) {
        // If title is empty at stop time, use a default
        setTitle((prev) => prev || '未命名會議');
      }

      setIsSubmitting(true);

      try {
        // Create meeting record
        const createRes = await fetch('/api/meetings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim() || '未命名會議',
            company: company.trim(),
            type,
          }),
        });

        if (!createRes.ok) throw new Error('建立會議失敗');
        const meeting = await createRes.json();

        // Determine file extension
        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
        const filename = `recording.${ext}`;

        if (navigator.onLine) {
          // Upload directly
          const form = new FormData();
          form.append('audio', blob, filename);

          // Update duration before upload
          await fetch(`/api/meetings/${meeting.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ duration: durationSeconds }),
          }).catch(() => {});

          await fetch(`/api/meetings/${meeting.id}/upload`, { method: 'POST', body: form });
        } else {
          // Queue for later
          await enqueue(meeting.id, blob, filename);
        }

        router.push(`/processing/${meeting.id}`);
      } catch (err) {
        console.error(err);
        alert('儲存失敗，請重試');
        setIsSubmitting(false);
      }
    },
    [title, company, type, enqueue, router]
  );

  const { state, duration, volume, error, start, pause, resume, stop } = useMediaRecorder({
    onStop: handleStop,
  });

  const isActive = state !== 'idle';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <a href="/meetings" className="text-gray-400 hover:text-gray-600 text-2xl leading-none">‹</a>
        <h1 className="text-lg font-semibold text-gray-900">新增錄音</h1>
      </header>

      <div className="flex-1 flex flex-col gap-5 p-4">
        {/* Meeting info form — disable while recording */}
        <div className={`space-y-3 ${isActive ? 'opacity-50 pointer-events-none' : ''}`}>
          <input
            type="text"
            placeholder="輸入會議名稱，如：台積電 2025Q2 法說"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-gray-400"
          />

          <input
            type="text"
            placeholder="公司名稱（選填）"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-gray-400"
          />

          {/* Meeting type chips */}
          <div className="flex flex-wrap gap-2">
            {MEETING_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={[
                  'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  type === t.value
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-600',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
            <p className="mt-1 text-xs text-red-500">
              iOS：設定 → Safari → 麥克風 → 允許<br />
              Android：瀏覽器網址列旁鎖頭圖示 → 麥克風 → 允許
            </p>
          </div>
        )}

        {/* Central recording area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
          {/* Timer — only shown when active */}
          {isActive && <RecordingTimer seconds={duration} />}

          {/* Status label */}
          {state === 'recording' && (
            <p className="text-sm font-medium text-red-500 animate-pulse">● 錄音中</p>
          )}
          {state === 'paused' && (
            <p className="text-sm font-medium text-orange-500">⏸ 暫停中，點擊繼續</p>
          )}
          {state === 'idle' && !isSubmitting && (
            <p className="text-sm text-gray-400">點擊按鈕開始錄音</p>
          )}
          {isSubmitting && (
            <p className="text-sm text-indigo-500 animate-pulse">上傳中，請稍候…</p>
          )}

          {/* Waveform */}
          <AudioWaveform volume={volume} active={state === 'recording'} />

          {/* Main record button */}
          <RecordButton state={state} onStart={start} onPause={pause} onResume={resume} />

          {/* Stop button — appears once recording starts */}
          {isActive && !isSubmitting && (
            <button
              onClick={stop}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-gray-800 text-white text-sm font-medium active:bg-gray-900 shadow"
            >
              <Square className="w-4 h-4" fill="white" />
              停止並儲存
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
