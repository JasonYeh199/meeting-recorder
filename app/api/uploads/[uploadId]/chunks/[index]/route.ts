import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/client';
import { uploadSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ uploadId: string; index: string }> };

// PUT /api/uploads/[uploadId]/chunks/[index] — receive a binary chunk
export async function PUT(req: NextRequest, { params }: Params) {
  const { uploadId, index: indexStr } = await params;
  const chunkIndex = parseInt(indexStr, 10);

  if (isNaN(chunkIndex) || chunkIndex < 0) {
    return Response.json({ error: '無效的 chunk 索引' }, { status: 400 });
  }

  const db = getDb();
  const [session] = await db
    .select()
    .from(uploadSessions)
    .where(eq(uploadSessions.id, uploadId));

  if (!session) {
    return Response.json({ error: '找不到上傳會話' }, { status: 404 });
  }

  if (chunkIndex >= session.totalChunks) {
    return Response.json({ error: 'chunk 索引超出範圍' }, { status: 400 });
  }

  // Write chunk to disk
  const storagePath = process.env.AUDIO_STORAGE_PATH ?? './uploads';
  const tmpDir = path.join(storagePath, 'tmp', uploadId);
  fs.mkdirSync(tmpDir, { recursive: true });

  const chunkPath = path.join(tmpDir, `chunk_${String(chunkIndex).padStart(3, '0')}`);
  const buffer = Buffer.from(await req.arrayBuffer());
  fs.writeFileSync(chunkPath, buffer);

  // Update uploaded chunks list
  const uploadedChunks = session.uploadedChunks as number[];
  if (!uploadedChunks.includes(chunkIndex)) {
    uploadedChunks.push(chunkIndex);
    uploadedChunks.sort((a, b) => a - b);
  }

  await db
    .update(uploadSessions)
    .set({ uploadedChunks, status: 'uploading' })
    .where(eq(uploadSessions.id, uploadId));

  return Response.json({ received: true, index: chunkIndex });
}
