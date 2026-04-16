'use client';

import { useRef, useState, useCallback } from 'react';

export type MeetingType = 'broker_seminar' | 'company_visit' | 'earnings_call' | 'other';

export interface MeetingMeta {
  title: string;
  company: string;
  type: MeetingType;
  recordedAt: Date;
  notes?: string;
}

type UploadState = 'idle' | 'uploading' | 'paused' | 'completed' | 'failed';

export interface UseChunkedUploadReturn {
  start: () => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  cancel: () => Promise<void>;
  state: UploadState;
  progress: number;
  bytesUploaded: number;
  uploadId: string | null;
  meetingId: string | null;
  error: string | null;
}

const STORAGE_KEY = 'mr_upload_state';
const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB — matches server
const MAX_RETRIES = 3;

export interface PersistedUploadState {
  uploadId: string;
  meetingId: string;
  filename: string;
  filesize: number;
  totalChunks: number;
  uploadedChunks: number[];
}

export function getPersistedUpload(): PersistedUploadState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedUploadState) : null;
  } catch {
    return null;
  }
}

export function clearPersistedUpload() {
  localStorage.removeItem(STORAGE_KEY);
}

function persistUpload(state: PersistedUploadState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useChunkedUpload(
  file: File | null,
  meta: MeetingMeta | null,
  opts: {
    onProgress?: (percent: number, bytesUploaded: number, bytesTotal: number) => void;
    onComplete?: (meetingId: string) => void;
    onError?: (error: Error) => void;
  } = {}
): UseChunkedUploadReturn {
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [bytesUploaded, setBytesUploaded] = useState(0);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pausedRef = useRef(false);
  const cancelledRef = useRef(false);

  const uploadChunks = useCallback(
    async (uid: string, mid: string, file: File, totalChunks: number, alreadyDone: number[]) => {
      const filesize = file.size;
      let uploaded = alreadyDone.length * CHUNK_SIZE;

      for (let i = 0; i < totalChunks; i++) {
        if (cancelledRef.current) return;

        // Wait if paused
        while (pausedRef.current && !cancelledRef.current) {
          await new Promise((r) => setTimeout(r, 300));
        }
        if (cancelledRef.current) return;

        if (alreadyDone.includes(i)) continue;

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, filesize);
        const chunk = file.slice(start, end);

        let lastErr: Error | null = null;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            const res = await fetch(`/api/uploads/${uid}/chunks/${i}`, {
              method: 'PUT',
              body: chunk,
              headers: { 'Content-Type': 'application/octet-stream' },
            });
            if (!res.ok) throw new Error(await res.text());
            lastErr = null;
            break;
          } catch (err) {
            lastErr = err as Error;
            if (attempt < MAX_RETRIES - 1) {
              await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            }
          }
        }

        if (lastErr) throw lastErr;

        alreadyDone.push(i);
        uploaded = Math.min(uploaded + (end - start), filesize);

        persistUpload({
          uploadId: uid,
          meetingId: mid,
          filename: file.name,
          filesize,
          totalChunks,
          uploadedChunks: [...alreadyDone],
        });

        const pct = Math.round((uploaded / filesize) * 100);
        setProgress(pct);
        setBytesUploaded(uploaded);
        opts.onProgress?.(pct, uploaded, filesize);
      }
    },
    [opts]
  );

  const start = useCallback(async () => {
    if (!file || !meta) return;

    pausedRef.current = false;
    cancelledRef.current = false;
    setState('uploading');
    setError(null);
    setProgress(0);
    setBytesUploaded(0);

    try {
      // Init session
      const initRes = await fetch('/api/uploads/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          filesize: file.size,
          mimetype: file.type,
          meetingMeta: {
            title: meta.title,
            company: meta.company,
            type: meta.type,
            recordedAt: meta.recordedAt.toISOString(),
            notes: meta.notes,
          },
        }),
      });

      if (!initRes.ok) {
        const err = await initRes.json();
        throw new Error(err.error ?? '初始化上傳失敗');
      }

      const { uploadId: uid, meetingId: mid, totalChunks } = await initRes.json() as {
        uploadId: string;
        meetingId: string;
        totalChunks: number;
      };

      setUploadId(uid);
      setMeetingId(mid);

      persistUpload({
        uploadId: uid,
        meetingId: mid,
        filename: file.name,
        filesize: file.size,
        totalChunks,
        uploadedChunks: [],
      });

      await uploadChunks(uid, mid, file, totalChunks, []);

      if (cancelledRef.current) return;

      // Complete
      const completeRes = await fetch(`/api/uploads/${uid}/complete`, { method: 'POST' });
      if (!completeRes.ok) {
        const err = await completeRes.json();
        throw new Error(err.error ?? '合併失敗');
      }

      clearPersistedUpload();
      setState('completed');
      setProgress(100);
      opts.onComplete?.(mid);
    } catch (err) {
      const e = err as Error;
      if (!cancelledRef.current) {
        setState('failed');
        setError(e.message);
        opts.onError?.(e);
      }
    }
  }, [file, meta, uploadChunks, opts]);

  const pause = useCallback(() => {
    pausedRef.current = true;
    setState('paused');
  }, []);

  const resume = useCallback(async () => {
    if (!file || !uploadId || !meetingId) return;

    pausedRef.current = false;
    setState('uploading');

    try {
      const statusRes = await fetch(`/api/uploads/${uploadId}/status`);
      if (!statusRes.ok) throw new Error('無法取得上傳狀態');

      const { uploadedChunks, totalChunks } = await statusRes.json() as {
        uploadedChunks: number[];
        totalChunks: number;
      };

      await uploadChunks(uploadId, meetingId, file, totalChunks, uploadedChunks);

      if (cancelledRef.current) return;

      const completeRes = await fetch(`/api/uploads/${uploadId}/complete`, { method: 'POST' });
      if (!completeRes.ok) {
        const err = await completeRes.json();
        throw new Error(err.error ?? '合併失敗');
      }

      clearPersistedUpload();
      setState('completed');
      setProgress(100);
      opts.onComplete?.(meetingId);
    } catch (err) {
      const e = err as Error;
      setState('failed');
      setError(e.message);
      opts.onError?.(e);
    }
  }, [file, uploadId, meetingId, uploadChunks, opts]);

  const cancel = useCallback(async () => {
    cancelledRef.current = true;
    setState('idle');
    setProgress(0);
    setBytesUploaded(0);
    setError(null);

    const uid = uploadId;
    setUploadId(null);
    setMeetingId(null);
    clearPersistedUpload();

    if (uid) {
      await fetch(`/api/uploads/${uid}`, { method: 'DELETE' }).catch(() => {});
    }
  }, [uploadId]);

  return { start, pause, resume, cancel, state, progress, bytesUploaded, uploadId, meetingId, error };
}
