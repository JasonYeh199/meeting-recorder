import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/client';
import { uploadSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { deleteChunks } from '@/lib/storage';

type Params = { params: Promise<{ uploadId: string }> };

// DELETE /api/uploads/[uploadId] — cancel and clean up a pending upload
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { uploadId } = await params;
  const db = getDb();

  const [session] = await db
    .select()
    .from(uploadSessions)
    .where(eq(uploadSessions.id, uploadId));

  if (!session) {
    return new Response(null, { status: 204 });
  }

  await deleteChunks(uploadId);
  await db.delete(uploadSessions).where(eq(uploadSessions.id, uploadId));

  return new Response(null, { status: 204 });
}
