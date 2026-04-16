'use client';

import { useEffect, useRef, useCallback } from 'react';

interface QueuedUpload {
  meetingId: string;
  blob: Blob;
  filename: string;
  enqueuedAt: number;
}

const DB_NAME = 'meeting-recorder-offline';
const STORE_NAME = 'upload-queue';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'meetingId' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveToQueue(item: QueuedUpload) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getQueue(): Promise<QueuedUpload[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function removeFromQueue(meetingId: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(meetingId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function uploadItem(item: QueuedUpload): Promise<void> {
  const form = new FormData();
  form.append('audio', item.blob, item.filename);
  const res = await fetch(`/api/meetings/${item.meetingId}/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
}

export function useOfflineQueue() {
  const processingRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    if (!navigator.onLine) return;

    processingRef.current = true;
    try {
      const queue = await getQueue();
      for (const item of queue) {
        try {
          await uploadItem(item);
          await removeFromQueue(item.meetingId);
        } catch {
          // leave in queue, retry next time
        }
      }
    } finally {
      processingRef.current = false;
    }
  }, []);

  // Process queue when coming back online
  useEffect(() => {
    window.addEventListener('online', processQueue);
    // Also attempt on mount in case we're already online
    processQueue();
    return () => window.removeEventListener('online', processQueue);
  }, [processQueue]);

  const enqueue = useCallback(
    async (meetingId: string, blob: Blob, filename: string) => {
      await saveToQueue({ meetingId, blob, filename, enqueuedAt: Date.now() });
      processQueue();
    },
    [processQueue]
  );

  return { enqueue };
}
