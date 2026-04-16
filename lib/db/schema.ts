import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import type {
  FinancialDataItem,
  SentimentItem,
  QAItem,
  FollowUpItem,
  RiskOpportunityItem,
  HistoricalComparison,
} from '@/lib/analysis-types';

function uuid() {
  return crypto.randomUUID();
}

export const meetings = sqliteTable('meetings', {
  id: text('id').primaryKey().$defaultFn(uuid),
  title: text('title').notNull(),
  company: text('company').notNull().default(''),
  type: text('type', {
    enum: ['broker_seminar', 'company_visit', 'earnings_call', 'other'],
  })
    .notNull()
    .default('other'),
  source: text('source', { enum: ['recording', 'upload'] })
    .notNull()
    .default('recording'),
  recordedAt: text('recorded_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  duration: integer('duration').notNull().default(0),
  audioPath: text('audio_path').notNull().default(''),
  audioSize: integer('audio_size').notNull().default(0),
  status: text('status', {
    enum: ['uploading', 'transcribing', 'analyzing', 'completed', 'failed'],
  })
    .notNull()
    .default('uploading'),
  errorMessage: text('error_message'),
  userId: text('user_id'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const meetingTranscripts = sqliteTable('meeting_transcripts', {
  id: text('id').primaryKey().$defaultFn(uuid),
  meetingId: text('meeting_id')
    .notNull()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  segments: text('segments', { mode: 'json' })
    .$type<{ start: number; end: number; speaker?: string; text: string }[]>()
    .notNull()
    .default(sql`'[]'`),
  fullText: text('full_text').notNull().default(''),
  language: text('language').notNull().default('zh'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const meetingAnalyses = sqliteTable('meeting_analyses', {
  id: text('id').primaryKey().$defaultFn(uuid),
  meetingId: text('meeting_id')
    .notNull()
    .references(() => meetings.id, { onDelete: 'cascade' }),

  // ── Legacy fields (kept for backward compat with old meetings) ──
  summary: text('summary').notNull().default(''),
  keyNumbers: text('key_numbers').notNull().default(''),
  sentiment: text('sentiment').notNull().default(''),
  qaHighlights: text('qa_highlights').notNull().default(''),
  followUps: text('follow_ups').notNull().default(''),

  // ── Phase 1: Quick summary ──
  quickSummary: text('quick_summary').notNull().default(''),

  // ── Phase 2: Structured analysis ──
  executiveSummary: text('executive_summary').notNull().default(''),
  financialData: text('financial_data', { mode: 'json' })
    .$type<FinancialDataItem[]>()
    .notNull()
    .default(sql`'[]'`),
  sentimentAnalysisJson: text('sentiment_analysis_json', { mode: 'json' })
    .$type<SentimentItem[]>()
    .notNull()
    .default(sql`'[]'`),
  qaHighlightsJson: text('qa_highlights_json', { mode: 'json' })
    .$type<QAItem[]>()
    .notNull()
    .default(sql`'[]'`),
  followUpItems: text('follow_up_items', { mode: 'json' })
    .$type<FollowUpItem[]>()
    .notNull()
    .default(sql`'[]'`),
  risksAndOpportunities: text('risks_opportunities', { mode: 'json' })
    .$type<RiskOpportunityItem[]>()
    .notNull()
    .default(sql`'[]'`),
  vsLastMeeting: text('vs_last_meeting', { mode: 'json' })
    .$type<HistoricalComparison | null>(),
  confidence: integer('confidence').notNull().default(70), // 0-100
  analysisWarnings: text('analysis_warnings', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  phase: text('phase', { enum: ['quick', 'full'] }).notNull().default('quick'),

  generatedAt: text('generated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const uploadSessions = sqliteTable('upload_sessions', {
  id: text('id').primaryKey().$defaultFn(uuid),
  meetingId: text('meeting_id')
    .notNull()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  filesize: integer('filesize').notNull(),
  mimetype: text('mimetype').notNull(),
  ext: text('ext').notNull(),
  totalChunks: integer('total_chunks').notNull(),
  uploadedChunks: text('uploaded_chunks', { mode: 'json' })
    .$type<number[]>()
    .notNull()
    .default(sql`'[]'`),
  status: text('status', {
    enum: ['pending', 'uploading', 'merging', 'completed', 'failed'],
  })
    .notNull()
    .default('pending'),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const analystNotes = sqliteTable('analyst_notes', {
  id: text('id').primaryKey().$defaultFn(uuid),
  meetingId: text('meeting_id')
    .notNull()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  anchorType: text('anchor_type', {
    enum: ['general', 'financial', 'sentiment', 'qa', 'followup', 'transcript'],
  })
    .notNull()
    .default('general'),
  anchorId: text('anchor_id'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});
