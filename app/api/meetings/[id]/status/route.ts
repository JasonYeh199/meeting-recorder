import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/client';
import { meetings, meetingAnalyses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

const STATUS_LABELS: Record<string, string> = {
  uploading: '上傳音檔中...',
  transcribing: '語音轉文字（Whisper 處理中）',
  analyzing: 'AI 分析中（Claude 處理中）',
  completed: '處理完成',
  failed: '處理失敗',
};

// GET /api/meetings/[id]/status — SSE stream of processing progress
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      while (true) {
        try {
          const db = getDb();
          const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));

          if (!meeting) {
            send({ error: '找不到會議' });
            controller.close();
            return;
          }

          // Include quickSummary if Phase 1 is done (analyzing status)
          let quickSummary: string | undefined;
          if (meeting.status === 'analyzing' || meeting.status === 'completed') {
            const [analysis] = await db
              .select({ quickSummary: meetingAnalyses.quickSummary, phase: meetingAnalyses.phase })
              .from(meetingAnalyses)
              .where(eq(meetingAnalyses.meetingId, id));
            if (analysis?.quickSummary) {
              quickSummary = analysis.quickSummary;
            }
          }

          send({
            status: meeting.status,
            label: STATUS_LABELS[meeting.status] ?? meeting.status,
            errorMessage: meeting.errorMessage ?? null,
            ...(quickSummary ? { quickSummary } : {}),
          });

          if (meeting.status === 'completed' || meeting.status === 'failed') {
            controller.enqueue(encoder.encode(`data: {"done":true}\n\n`));
            controller.close();
            return;
          }
        } catch (err) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`)
          );
          controller.close();
          return;
        }

        await new Promise<void>((resolve) => setTimeout(resolve, 2000));
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
