import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/client';
import { analystNotes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

// GET /api/meetings/[id]/notes
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = getDb();
  const notes = await db
    .select()
    .from(analystNotes)
    .where(eq(analystNotes.meetingId, id));
  return Response.json(notes);
}

// POST /api/meetings/[id]/notes
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as {
    content: string;
    anchorType?: string;
    anchorId?: string;
  };

  if (!body.content?.trim()) {
    return Response.json({ error: '筆記內容不能為空' }, { status: 400 });
  }

  const db = getDb();
  const [note] = await db
    .insert(analystNotes)
    .values({
      meetingId: id,
      content: body.content.trim(),
      anchorType: (body.anchorType as 'general' | 'financial' | 'sentiment' | 'qa' | 'followup' | 'transcript') ?? 'general',
      anchorId: body.anchorId ?? null,
    })
    .returning();

  return Response.json(note, { status: 201 });
}
