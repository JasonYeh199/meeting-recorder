import { pgTable, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
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

export const meetings = pgTable('meetings', {
  id: text('id').primaryKey().$defaultFn(uuid),
  title: text('title').notNull(),
  company: text('company').notNull().default(''),
  type: text('type').notNull().default('other'),
  source: text('source').notNull().default('recording'),
  recordedAt: timestamp('recorded_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
  duration: integer('duration').notNull().default(0),
  audioPath: text('audio_path').notNull().default(''),
  audioSize: integer('audio_size').notNull().default(0),
  status: text('status').notNull().default('uploading'),
  errorMessage: text('error_message'),
  userId: text('user_id'),
  createdAt: timestamp('created_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export const meetingTranscripts = pgTable('meeting_transcripts', {
  id: text('id').primaryKey().$defaultFn(uuid),
  meetingId: text('meeting_id')
    .notNull()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  segments: jsonb('segments')
    .$type<{ start: number; end: number; speaker?: string; text: string }[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  fullText: text('full_text').notNull().default(''),
  language: text('language').notNull().default('zh'),
  createdAt: timestamp('created_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export const meetingAnalyses = pgTable('meeting_analyses', {
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
  financialData: jsonb('financial_data')
    .$type<FinancialDataItem[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  sentimentAnalysisJson: jsonb('sentiment_analysis_json')
    .$type<SentimentItem[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  qaHighlightsJson: jsonb('qa_highlights_json')
    .$type<QAItem[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  followUpItems: jsonb('follow_up_items')
    .$type<FollowUpItem[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  risksAndOpportunities: jsonb('risks_opportunities')
    .$type<RiskOpportunityItem[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  vsLastMeeting: jsonb('vs_last_meeting')
    .$type<HistoricalComparison | null>(),
  confidence: integer('confidence').notNull().default(70), // 0-100
  analysisWarnings: jsonb('analysis_warnings')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  phase: text('phase').notNull().default('quick'),

  generatedAt: timestamp('generated_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export const uploadSessions = pgTable('upload_sessions', {
  id: text('id').primaryKey().$defaultFn(uuid),
  meetingId: text('meeting_id')
    .notNull()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  filesize: integer('filesize').notNull(),
  mimetype: text('mimetype').notNull(),
  ext: text('ext').notNull(),
  totalChunks: integer('total_chunks').notNull(),
  uploadedChunks: jsonb('uploaded_chunks')
    .$type<number[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  status: text('status').notNull().default('pending'),
  expiresAt: text('expires_at').notNull(),
  createdAt: timestamp('created_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export const analystNotes = pgTable('analyst_notes', {
  id: text('id').primaryKey().$defaultFn(uuid),
  meetingId: text('meeting_id')
    .notNull()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  anchorType: text('anchor_type').notNull().default('general'),
  anchorId: text('anchor_id'),
  createdAt: timestamp('created_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
});
