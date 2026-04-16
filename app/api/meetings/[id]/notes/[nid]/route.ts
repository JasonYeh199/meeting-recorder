import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/client';
import { analystNotes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

type Params = { params: Promise<{ id: string; nid: string }> };

// PUT /api/meetings/[id]/notes/[nid]
export async function PUT(req: NextRequest, { params }: Params) {
  const { id, nid } = await params;
  const body = await req.json() as { content: string };

  if (!body.content?.trim()) {
    return Response.json({ error: '筆記內容不能為空' }, { status: 400 });
  }

  const db = getDb();
  const [updated] = await db
    .update(analystNotes)
    .set({ content: body.content.trim(), updatedAt: new Date().toISOString() })
    .where(and(eq(analystNotes.id, nid), eq(analystNotes.meetingId, id)))
    .returning();

  if (!updated) return Response.json({ error: '找不到筆記' }, { status: 404 });
  return Response.json(updated);
}

// DELETE /api/meetings/[id]/notes/[nid]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { nid, id } = await params;
  const db = getDb();
  await db
    .delete(analystNotes)
    .where(and(eq(analystNotes.id, nid), eq(analystNotes.meetingId, id)));
  return new Response(null, { status: 204 });
}
