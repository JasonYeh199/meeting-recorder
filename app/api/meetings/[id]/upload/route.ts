import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/client';
import { meetings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { processMeeting } from '@/lib/process-meeting';

export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

// POST /api/meetings/[id]/upload — receive audio from recorder, kick off transcription + analysis
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = getDb();

  const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
  if (!meeting) return Response.json({ error: '找不到會議' }, { status: 404 });

  const formData = await req.formData();
  const audioFile = formData.get('audio') as File | null;

  if (!audioFile) return Response.json({ error: '未收到音檔' }, { status: 400 });

  const storagePath = process.env.AUDIO_STORAGE_PATH ?? './uploads';
  fs.mkdirSync(storagePath, { recursive: true });

  const ext = audioFile.name.split('.').pop() ?? 'webm';
  const filename = `${id}.${ext}`;
  const audioPath = path.join(storagePath, filename);

  const buffer = Buffer.from(await audioFile.arrayBuffer());
  fs.writeFileSync(audioPath, buffer);

  await db
    .update(meetings)
    .set({ audioPath, audioSize: buffer.length, status: 'transcribing', updatedAt: new Date().toISOString() })
    .where(eq(meetings.id, id));

  processMeeting(id).catch(async (err) => {
    await db
      .update(meetings)
      .set({ status: 'failed', errorMessage: String(err), updatedAt: new Date().toISOString() })
      .where(eq(meetings.id, id));
  });

  return Response.json({ ok: true, status: 'transcribing' });
}
