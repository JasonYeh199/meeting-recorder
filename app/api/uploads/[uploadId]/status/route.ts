import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/client';
import { uploadSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ uploadId: string }> };

// GET /api/uploads/[uploadId]/status — current upload session state
export async function GET(_req: NextRequest, { params }: Params) {
  const { uploadId } = await params;
  const db = getDb();

  const [session] = await db
    .select()
    .from(uploadSessions)
    .where(eq(uploadSessions.id, uploadId));

  if (!session) {
    return Response.json({ error: '找不到上傳會話' }, { status: 404 });
  }

  return Response.json({
    uploadedChunks: session.uploadedChunks as number[],
    totalChunks: session.totalChunks,
    status: session.status,
  });
}
