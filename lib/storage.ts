/**
 * Storage abstraction layer.
 * - Local dev (no BLOB_READ_WRITE_TOKEN): uses ./uploads/ filesystem
 * - Vercel (BLOB_READ_WRITE_TOKEN set): uses Vercel Blob (private store)
 */

import fs from 'fs';
import path from 'path';

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
const LOCAL_BASE = process.env.AUDIO_STORAGE_PATH ?? './uploads';

/** Fetch a private Vercel Blob URL with the auth token. */
async function fetchBlob(url: string): Promise<Response> {
  return fetch(url, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });
}

// ─── Audio files ──────────────────────────────────────────────────────────────

/** Save audio buffer. Returns local path or blob URL. */
export async function saveAudio(
  key: string,
  buffer: Buffer,
  contentType = 'audio/mpeg'
): Promise<string> {
  if (USE_BLOB) {
    const { put } = await import('@vercel/blob');
    const result = await put(`audio/${key}`, buffer, { access: 'private', contentType });
    return result.url;
  }
  const filePath = path.join(LOCAL_BASE, key);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

/** Read audio as Buffer from local path or blob URL. */
export async function readAudio(pathOrUrl: string): Promise<Buffer> {
  if (pathOrUrl.startsWith('https://')) {
    const res = await fetchBlob(pathOrUrl);
    if (!res.ok) throw new Error(`Failed to fetch audio: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return fs.readFileSync(pathOrUrl);
}

/** Delete audio (local file or blob). */
export async function deleteAudio(pathOrUrl: string): Promise<void> {
  if (pathOrUrl.startsWith('https://')) {
    const { del } = await import('@vercel/blob');
    await del(pathOrUrl).catch(() => {});
  } else if (pathOrUrl) {
    fs.unlink(pathOrUrl, () => {});
  }
}

// ─── Chunks (for chunked upload) ─────────────────────────────────────────────

function chunkLocalPath(uploadId: string, index: number): string {
  return path.join(LOCAL_BASE, 'tmp', uploadId, `chunk_${String(index).padStart(3, '0')}`);
}

function chunkBlobKey(uploadId: string, index: number): string {
  return `chunks/${uploadId}/${String(index).padStart(3, '0')}`;
}

/** Save a chunk. */
export async function saveChunk(uploadId: string, index: number, buffer: Buffer): Promise<void> {
  if (USE_BLOB) {
    const { put } = await import('@vercel/blob');
    await put(chunkBlobKey(uploadId, index), buffer, {
      access: 'private',
      contentType: 'application/octet-stream',
    });
  } else {
    const p = chunkLocalPath(uploadId, index);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, buffer);
  }
}

/** Read a single chunk as Buffer. */
export async function readChunk(uploadId: string, index: number): Promise<Buffer> {
  if (USE_BLOB) {
    const { list } = await import('@vercel/blob');
    const key = chunkBlobKey(uploadId, index);
    const { blobs } = await list({ prefix: key });
    const blob = blobs.find((b) => b.pathname === key || b.pathname.endsWith(key));
    if (!blob) throw new Error(`Chunk ${index} not found in blob storage`);
    const res = await fetchBlob(blob.url);
    return Buffer.from(await res.arrayBuffer());
  }
  return fs.readFileSync(chunkLocalPath(uploadId, index));
}

/** Merge all chunks into a single Buffer and delete them. */
export async function mergeAndDeleteChunks(
  uploadId: string,
  totalChunks: number
): Promise<Buffer> {
  const buffers: Buffer[] = [];
  for (let i = 0; i < totalChunks; i++) {
    buffers.push(await readChunk(uploadId, i));
  }
  await deleteChunks(uploadId);
  return Buffer.concat(buffers);
}

/** Delete all chunks for an upload. */
export async function deleteChunks(uploadId: string): Promise<void> {
  if (USE_BLOB) {
    const { list, del } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: `chunks/${uploadId}/` });
    await Promise.all(blobs.map((b) => del(b.url)));
  } else {
    const dir = path.join(LOCAL_BASE, 'tmp', uploadId);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
