import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/client';
import { meetings, meetingTranscripts, meetingAnalyses } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

// GET /api/meetings
export async function GET() {
  const db = getDb();
  const rows = await db
    .select()
    .from(meetings)
    .orderBy(desc(meetings.createdAt))
    .limit(100);

  return Response.json(rows);
}

// POST /api/meetings — create a new meeting record
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, company, type } = body as {
    title: string;
    company?: string;
    type?: string;
  };

  if (!title?.trim()) {
    return Response.json({ error: '會議標題不可為空' }, { status: 400 });
  }

  const db = getDb();
  const [meeting] = await db
    .insert(meetings)
    .values({
      title: title.trim(),
      company: company?.trim() ?? '',
      type: (type as 'broker_seminar' | 'company_visit' | 'earnings_call' | 'other') ?? 'other',
      status: 'uploading',
    })
    .returning();

  return Response.json(meeting, { status: 201 });
}
