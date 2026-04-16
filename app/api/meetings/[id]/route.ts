import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/client';
import { meetings, meetingTranscripts, meetingAnalyses, analystNotes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';

type Params = { params: Promise<{ id: string }> };

// GET /api/meetings/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = getDb();

  const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
  if (!meeting) return Response.json({ error: '找不到會議' }, { status: 404 });

  const [transcript] = await db
    .select()
    .from(meetingTranscripts)
    .where(eq(meetingTranscripts.meetingId, id));

  const [analysis] = await db
    .select()
    .from(meetingAnalyses)
    .where(eq(meetingAnalyses.meetingId, id));

  const notes = await db
    .select()
    .from(analystNotes)
    .where(eq(analystNotes.meetingId, id));

  return Response.json({
    meeting,
    transcript: transcript ?? null,
    analysis: analysis ?? null,
    notes,
  });
}

// PATCH /api/meetings/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json() as Partial<{ duration: number; title: string }>;

  const [updated] = await db
    .update(meetings)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(meetings.id, id))
    .returning();

  if (!updated) return Response.json({ error: '找不到會議' }, { status: 404 });
  return Response.json(updated);
}

// DELETE /api/meetings/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = getDb();

  const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
  if (!meeting) return Response.json({ error: '找不到會議' }, { status: 404 });

  if (meeting.audioPath) {
    fs.unlink(meeting.audioPath, () => {});
  }

  await db.delete(meetings).where(eq(meetings.id, id));
  return new Response(null, { status: 204 });
}
