import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/client';
import { meetings, uploadSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { processMeeting } from '@/lib/process-meeting';

export const maxDuration = 300;

type Params = { params: Promise<{ uploadId: string }> };

// POST /api/uploads/[uploadId]/complete — merge chunks and kick off processing
export async function POST(_req: NextRequest, { params }: Params) {
  const { uploadId } = await params;
  const db = getDb();

  const [session] = await db
    .select()
    .from(uploadSessions)
    .where(eq(uploadSessions.id, uploadId));

  if (!session) {
    return Response.json({ error: '找不到上傳會話' }, { status: 404 });
  }

  const uploadedChunks = session.uploadedChunks as number[];
  if (uploadedChunks.length < session.totalChunks) {
    return Response.json(
      { error: `尚有 ${session.totalChunks - uploadedChunks.length} 個 chunk 未上傳` },
      { status: 400 }
    );
  }

  await db
    .update(uploadSessions)
    .set({ status: 'merging' })
    .where(eq(uploadSessions.id, uploadId));

  const storagePath = process.env.AUDIO_STORAGE_PATH ?? './uploads';
  const tmpDir = path.join(storagePath, 'tmp', uploadId);
  const audioPath = path.join(storagePath, `${session.meetingId}.${session.ext}`);

  // Merge all chunks into the final file
  const fd = fs.openSync(audioPath, 'w');
  try {
    for (let i = 0; i < session.totalChunks; i++) {
      const chunkPath = path.join(tmpDir, `chunk_${String(i).padStart(3, '0')}`);
      const chunkData = fs.readFileSync(chunkPath);
      fs.writeSync(fd, chunkData);
    }
  } finally {
    fs.closeSync(fd);
  }

  // Clean up tmp chunks
  fs.rmSync(tmpDir, { recursive: true, force: true });

  // Update meeting: ready for transcription
  await db
    .update(meetings)
    .set({
      audioPath,
      audioSize: session.filesize,
      status: 'transcribing',
      updatedAt: new Date().toISOString(),
    })
    .where(eq(meetings.id, session.meetingId));

  await db
    .update(uploadSessions)
    .set({ status: 'completed' })
    .where(eq(uploadSessions.id, uploadId));

  // Fire-and-forget processing
  processMeeting(session.meetingId).catch(async (err) => {
    await db
      .update(meetings)
      .set({ status: 'failed', errorMessage: String(err), updatedAt: new Date().toISOString() })
      .where(eq(meetings.id, session.meetingId));
  });

  return Response.json({ meetingId: session.meetingId });
}
