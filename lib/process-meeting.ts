import { getDb } from '@/lib/db/client';
import { meetings, meetingTranscripts, meetingAnalyses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { transcribeAudio } from '@/lib/whisper';
import { generateQuickSummary, generateFullAnalysis } from '@/lib/meeting-claude';
import { compareWithLastMeeting } from '@/lib/comparison';

/**
 * Full processing pipeline for a meeting:
 *   Transcription → Phase 1 quick summary → Phase 2 full analysis → Historical comparison
 *
 * The meeting must already have audioPath set and status = 'transcribing'.
 */
export async function processMeeting(meetingId: string): Promise<void> {
  const db = getDb();

  const [meeting] = await db.select().from(meetings).where(eq(meetings.id, meetingId));
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  // ── Step 1: Transcribe ─────────────────────────────────────────────────────
  const transcript = await transcribeAudio(meeting.audioPath);

  await db.insert(meetingTranscripts).values({
    meetingId,
    segments: transcript.segments,
    fullText: transcript.fullText,
    language: transcript.language,
  });

  await db
    .update(meetings)
    .set({ status: 'analyzing', updatedAt: new Date().toISOString() })
    .where(eq(meetings.id, meetingId));

  const meta = { title: meeting.title, company: meeting.company, type: meeting.type };

  // ── Step 2a: Phase 1 — Quick summary ──────────────────────────────────────
  const quickSummary = await generateQuickSummary(transcript.fullText, meta);

  // Insert analysis row with Phase 1 data; we'll update it after Phase 2
  await db.insert(meetingAnalyses).values({
    meetingId,
    quickSummary,
    phase: 'quick',
    // Legacy fields (keep empty for new meetings)
    summary: quickSummary,
    keyNumbers: '',
    sentiment: '',
    qaHighlights: '',
    followUps: '',
  });

  // ── Step 2b: Phase 2 — Full structured analysis ────────────────────────────
  const fullAnalysis = await generateFullAnalysis(transcript.fullText, meta, quickSummary);

  // ── Step 2c: Historical comparison (if previous meeting from same company exists) ──
  const comparison = await compareWithLastMeeting(
    meetingId,
    meeting.company,
    meeting.recordedAt,
    fullAnalysis
  );

  // Update the analysis row with Phase 2 data
  await db
    .update(meetingAnalyses)
    .set({
      executiveSummary: fullAnalysis.executiveSummary,
      financialData: fullAnalysis.financialData,
      sentimentAnalysisJson: fullAnalysis.sentimentAnalysis,
      qaHighlightsJson: fullAnalysis.qaHighlights,
      followUpItems: fullAnalysis.followUpItems,
      risksAndOpportunities: fullAnalysis.risksAndOpportunities,
      vsLastMeeting: comparison ?? null,
      confidence: fullAnalysis.confidence,
      analysisWarnings: fullAnalysis.warnings,
      phase: 'full',
    })
    .where(eq(meetingAnalyses.meetingId, meetingId));

  // ── Step 3: Mark meeting as completed ─────────────────────────────────────
  await db
    .update(meetings)
    .set({ status: 'completed', updatedAt: new Date().toISOString() })
    .where(eq(meetings.id, meetingId));
}
