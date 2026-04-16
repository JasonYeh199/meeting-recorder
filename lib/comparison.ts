import { getDb } from '@/lib/db/client';
import { meetings, meetingAnalyses } from '@/lib/db/schema';
import { eq, and, lt, desc, ne } from 'drizzle-orm';
import { compareAnalyses } from '@/lib/meeting-claude';
import type { FullAnalysis, HistoricalComparison } from '@/lib/analysis-types';

/**
 * Find the previous meeting from the same company and compare analyses.
 * Returns null if no previous meeting with full structured analysis exists.
 */
export async function compareWithLastMeeting(
  currentMeetingId: string,
  company: string,
  currentRecordedAt: string,
  currentAnalysis: FullAnalysis
): Promise<HistoricalComparison | null> {
  if (!company.trim()) return null;

  const db = getDb();

  // Find the most recent completed meeting for the same company before the current one
  const prevMeetings = await db
    .select()
    .from(meetings)
    .where(
      and(
        eq(meetings.company, company),
        eq(meetings.status, 'completed'),
        ne(meetings.id, currentMeetingId),
        lt(meetings.recordedAt, currentRecordedAt)
      )
    )
    .orderBy(desc(meetings.recordedAt))
    .limit(1);

  const prevMeeting = prevMeetings[0];
  if (!prevMeeting) return null;

  // Get its analysis
  const prevAnalyses = await db
    .select()
    .from(meetingAnalyses)
    .where(eq(meetingAnalyses.meetingId, prevMeeting.id));

  const prevAnalysis = prevAnalyses[0];
  if (!prevAnalysis || prevAnalysis.phase !== 'full') return null;

  // Build the FullAnalysis object from stored data
  const prevFullAnalysis: FullAnalysis = {
    executiveSummary: prevAnalysis.executiveSummary,
    financialData: (prevAnalysis.financialData as FullAnalysis['financialData']) ?? [],
    sentimentAnalysis: (prevAnalysis.sentimentAnalysisJson as FullAnalysis['sentimentAnalysis']) ?? [],
    qaHighlights: (prevAnalysis.qaHighlightsJson as FullAnalysis['qaHighlights']) ?? [],
    followUpItems: (prevAnalysis.followUpItems as FullAnalysis['followUpItems']) ?? [],
    risksAndOpportunities: (prevAnalysis.risksAndOpportunities as FullAnalysis['risksAndOpportunities']) ?? [],
    confidence: prevAnalysis.confidence,
    warnings: (prevAnalysis.analysisWarnings as string[]) ?? [],
  };

  return compareAnalyses(
    currentAnalysis,
    prevFullAnalysis,
    prevMeeting.id,
    prevMeeting.recordedAt,
    prevMeeting.type
  );
}
