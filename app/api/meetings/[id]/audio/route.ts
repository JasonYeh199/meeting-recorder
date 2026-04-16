import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/client';
import { meetings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

type Params = { params: Promise<{ id: string }> };

// GET /api/meetings/[id]/audio — serve the audio file
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = getDb();

  const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
  if (!meeting || !meeting.audioPath) {
    return Response.json({ error: '音檔不存在' }, { status: 404 });
  }

  const fullPath = path.resolve(meeting.audioPath);
  if (!fs.existsSync(fullPath)) {
    return Response.json({ error: '音檔檔案不存在' }, { status: 404 });
  }

  const ext = path.extname(fullPath).toLowerCase();
  const mimeType = ext === '.mp4' ? 'audio/mp4' : 'audio/webm';

  const buffer = fs.readFileSync(fullPath);
  return new Response(buffer, {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="recording${ext}"`,
      'Content-Length': String(buffer.length),
    },
  });
}
