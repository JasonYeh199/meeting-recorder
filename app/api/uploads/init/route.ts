import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/client';
import { meetings, uploadSessions } from '@/lib/db/schema';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB

const MIME_TO_EXT: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/wav': 'wav',
  'video/mp4': 'mp4',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
};

const ALLOWED_MIMES = new Set(Object.keys(MIME_TO_EXT));

// POST /api/uploads/init — initialise a chunked upload session
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    filename: string;
    filesize: number;
    mimetype: string;
    meetingMeta: {
      title: string;
      company?: string;
      type?: string;
      recordedAt?: string;
      notes?: string;
    };
  };

  const { filename, filesize, mimetype, meetingMeta } = body;

  if (!filename || !filesize || !mimetype) {
    return Response.json({ error: '缺少必要欄位' }, { status: 400 });
  }

  if (!ALLOWED_MIMES.has(mimetype)) {
    return Response.json({ error: `不支援的格式：${mimetype}` }, { status: 400 });
  }

  if (filesize > 500 * 1024 * 1024) {
    return Response.json({ error: '檔案超過 500 MB 限制' }, { status: 400 });
  }

  if (!meetingMeta?.title?.trim()) {
    return Response.json({ error: '會議標題為必填' }, { status: 400 });
  }

  const ext = MIME_TO_EXT[mimetype] ?? 'bin';
  const totalChunks = Math.ceil(filesize / CHUNK_SIZE);

  const db = getDb();

  // Create meeting record first
  const [meeting] = await db
    .insert(meetings)
    .values({
      title: meetingMeta.title.trim(),
      company: meetingMeta.company?.trim() ?? '',
      type: (meetingMeta.type as 'broker_seminar' | 'company_visit' | 'earnings_call' | 'other') ?? 'other',
      source: 'upload',
      recordedAt: meetingMeta.recordedAt ?? new Date().toISOString(),
      status: 'uploading',
    })
    .returning();

  // Create upload session
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const [session] = await db
    .insert(uploadSessions)
    .values({
      meetingId: meeting.id,
      filename,
      filesize,
      mimetype,
      ext,
      totalChunks,
      uploadedChunks: [],
      status: 'pending',
      expiresAt,
    })
    .returning();

  return Response.json({
    uploadId: session.id,
    meetingId: meeting.id,
    chunkSize: CHUNK_SIZE,
    totalChunks,
  });
}
