'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Play, Pause, Trash2, ArrowLeft, StickyNote, AlertTriangle } from 'lucide-react';
import { TranscriptViewer } from '@/components/meeting/TranscriptViewer';
import { FinancialDataGrid } from '@/components/analysis/FinancialDataGrid';
import { SentimentList } from '@/components/analysis/SentimentList';
import { QAAccordion } from '@/components/analysis/QAAccordion';
import { ComparisonSummaryCard } from '@/components/analysis/ComparisonSummaryCard';
import { FollowUpChecklist } from '@/components/analysis/FollowUpChecklist';
import { AnalystNoteBlock } from '@/components/analysis/AnalystNoteBlock';
import { ExportMenu } from '@/components/analysis/ExportMenu';
import type { FinancialDataItem, SentimentItem, QAItem, FollowUpItem, RiskOpportunityItem, HistoricalComparison } from '@/lib/analysis-types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Meeting {
  id: string; title: string; company: string; type: string;
  recordedAt: string; duration: number; audioPath: string; status: string; errorMessage?: string;
}

interface Transcript {
  segments: { start: number; end: number; speaker?: string; text: string }[];
  fullText: string;
}

interface Analysis {
  // Legacy
  summary?: string; keyNumbers?: string; sentiment?: string; qaHighlights?: string; followUps?: string;
  // Phase 1
  quickSummary?: string;
  // Phase 2
  phase?: 'quick' | 'full';
  executiveSummary?: string;
  financialData?: FinancialDataItem[];
  sentimentAnalysisJson?: SentimentItem[];
  qaHighlightsJson?: QAItem[];
  followUpItems?: FollowUpItem[];
  risksAndOpportunities?: RiskOpportunityItem[];
  vsLastMeeting?: HistoricalComparison | null;
  confidence?: number;
  analysisWarnings?: string[];
}

interface Note { id: string; content: string; createdAt: string; anchorType: string; }

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  broker_seminar: '券商座談', company_visit: '拜訪公司', earnings_call: '法說會', other: '其他',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDuration(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${p(h)}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
      {title}
      {count !== undefined && (
        <span className="text-sm font-normal text-gray-400">（{count} 項）</span>
      )}
    </h2>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Fetch data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    fetch(`/api/meetings/${id}`)
      .then((r) => r.json())
      .then(({ meeting: m, transcript: t, analysis: a, notes: n }) => {
        setMeeting(m);
        setTranscript(t);
        setAnalysis(a);
        setNotes(n ?? []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // ── Audio ───────────────────────────────────────────────────────────────────

  const seekTo = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = seconds;
    audioRef.current.play().catch(() => {});
    setIsPlaying(true);
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {}); }
  };

  // ── Notes CRUD ──────────────────────────────────────────────────────────────

  const addNote = useCallback(async (content: string) => {
    const res = await fetch(`/api/meetings/${id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    const note = await res.json() as Note;
    setNotes((prev) => [...prev, note]);
  }, [id]);

  const updateNote = useCallback(async (nid: string, content: string) => {
    const res = await fetch(`/api/meetings/${id}/notes/${nid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    const updated = await res.json() as Note;
    setNotes((prev) => prev.map((n) => (n.id === nid ? updated : n)));
  }, [id]);

  const deleteNote = useCallback(async (nid: string) => {
    await fetch(`/api/meetings/${id}/notes/${nid}`, { method: 'DELETE' });
    setNotes((prev) => prev.filter((n) => n.id !== nid));
  }, [id]);

  // ── Delete meeting ──────────────────────────────────────────────────────────

  const handleDelete = async () => {
    await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
    router.push('/meetings');
  };

  // ── Loading / error ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-500">找不到會議紀錄</p>
        <button onClick={() => router.push('/meetings')} className="text-indigo-500 underline text-sm">返回列表</button>
      </div>
    );
  }

  const isFullAnalysis = analysis?.phase === 'full';
  const hasLegacy = !isFullAnalysis && (analysis?.summary || analysis?.keyNumbers);
  const confidence = analysis?.confidence ?? 100;
  const lowConfidence = confidence < 70;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/meetings')} className="p-1 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-gray-900 truncate">{meeting.title}</h1>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
              {meeting.company && <span className="font-medium text-gray-600">{meeting.company}</span>}
              <span>{formatDate(meeting.recordedAt)}</span>
              {meeting.duration > 0 && <span>{formatDuration(meeting.duration)}</span>}
              <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">
                {TYPE_LABELS[meeting.type] ?? '其他'}
              </span>
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => setShowNotes(!showNotes)} className="flex items-center gap-1 px-2.5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              <StickyNote className="w-4 h-4" />
              <span className="hidden sm:inline">筆記</span>
              {notes.length > 0 && <span className="text-xs bg-orange-100 text-orange-600 rounded-full px-1.5">{notes.length}</span>}
            </button>
            {analysis && (
              <ExportMenu
                meeting={{ title: meeting.title, company: meeting.company, type: meeting.type, recordedAt: meeting.recordedAt }}
                analysis={{
                  quickSummary: analysis.quickSummary,
                  executiveSummary: analysis.executiveSummary,
                  financialData: analysis.financialData,
                  sentimentAnalysis: analysis.sentimentAnalysisJson,
                  qaHighlights: analysis.qaHighlightsJson,
                  followUpItems: analysis.followUpItems,
                }}
                transcript={transcript ?? undefined}
              />
            )}
          </div>
        </div>
      </header>

      {/* ── Audio bar ── */}
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <audio
          ref={audioRef}
          src={`/api/meetings/${id}/audio`}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
        />
        <button onClick={togglePlay} className="w-10 h-10 bg-indigo-500 text-white rounded-full flex items-center justify-center shrink-0">
          {isPlaying ? <Pause className="w-4 h-4" fill="white" /> : <Play className="w-4 h-4 ml-0.5" fill="white" />}
        </button>
        <div className="flex-1 h-1 bg-gray-200 rounded-full" />
        <button onClick={() => setShowDelete(true)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* ── Body ── */}
      <main className="flex-1 p-4 space-y-6 pb-12">

        {/* Low-confidence warning */}
        {analysis && lowConfidence && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-700">
              ⚠️ 逐字稿品質較低（信心分數 {confidence}%），AI 分析可能有誤，建議對照音檔確認。
              {(analysis.analysisWarnings ?? []).map((w, i) => (
                <span key={i} className="block mt-0.5">{w}</span>
              ))}
            </p>
          </div>
        )}

        {/* No analysis yet */}
        {!analysis && meeting.status !== 'completed' && (
          <div className="border border-gray-200 rounded-xl p-4 text-sm text-gray-400 text-center">
            {meeting.status === 'failed'
              ? <span className="text-red-500">處理失敗：{meeting.errorMessage}</span>
              : 'AI 分析尚未完成…'}
          </div>
        )}

        {/* ── Quick summary (Phase 1) ── */}
        {analysis?.quickSummary && (
          <div className="relative border-l-4 border-indigo-500 bg-indigo-50/40 rounded-r-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">🤖 快速摘要</h3>
              <span className="text-xs text-indigo-500 font-medium">AI 生成</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{analysis.quickSummary}</p>
          </div>
        )}

        {/* ── Phase 2: Full structured analysis ── */}
        {isFullAnalysis && (
          <>
            {/* Executive summary */}
            {analysis.executiveSummary && (
              <div>
                <SectionHeader title="完整摘要" />
                <p className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {analysis.executiveSummary}
                </p>
              </div>
            )}

            {/* Financial data */}
            {(analysis.financialData ?? []).length > 0 && (
              <div>
                <SectionHeader title="財務數據" count={analysis.financialData!.length} />
                <div className="mt-3">
                  <FinancialDataGrid items={analysis.financialData!} onSeek={seekTo} />
                </div>
              </div>
            )}

            {/* Sentiment */}
            {(analysis.sentimentAnalysisJson ?? []).length > 0 && (
              <div>
                <SectionHeader title="管理層態度" count={analysis.sentimentAnalysisJson!.length} />
                <div className="mt-3">
                  <SentimentList items={analysis.sentimentAnalysisJson!} onSeek={seekTo} />
                </div>
              </div>
            )}

            {/* Q&A */}
            {(analysis.qaHighlightsJson ?? []).length > 0 && (
              <div>
                <SectionHeader title="重要 Q&A" count={analysis.qaHighlightsJson!.filter((q) => q.importance !== 'low').length} />
                <div className="mt-3">
                  <QAAccordion items={analysis.qaHighlightsJson!} onSeek={seekTo} />
                </div>
              </div>
            )}

            {/* Historical comparison */}
            {analysis.vsLastMeeting && (
              <div>
                <ComparisonSummaryCard
                  data={analysis.vsLastMeeting}
                  lastMeetingDate={analysis.vsLastMeeting.lastMeetingDate}
                />
              </div>
            )}

            {/* Risks & Opportunities */}
            {(analysis.risksAndOpportunities ?? []).length > 0 && (
              <div>
                <SectionHeader title="風險與機會" count={analysis.risksAndOpportunities!.length} />
                <div className="mt-2 space-y-2">
                  {analysis.risksAndOpportunities!.map((r, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${r.type === 'risk' ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                      <span className="text-base">{r.type === 'risk' ? '⚠️' : '💡'}</span>
                      <div>
                        <p className="text-sm text-gray-800">{r.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {r.timeframe === 'short' ? '短期' : r.timeframe === 'medium' ? '中期' : '長期'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-ups */}
            {(analysis.followUpItems ?? []).length > 0 && (
              <div>
                <SectionHeader title="後續追蹤" count={analysis.followUpItems!.length} />
                <div className="mt-3 bg-orange-50/40 border border-orange-100 rounded-xl px-4 py-2">
                  <FollowUpChecklist items={analysis.followUpItems!} meetingId={id} />
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Legacy analysis display (old format meetings) ── */}
        {hasLegacy && !isFullAnalysis && (
          <div className="relative border-l-4 border-indigo-500 bg-indigo-50/40 rounded-r-xl p-4 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900">AI 摘要</h3>
              <span className="text-xs text-indigo-500 font-medium">🤖 AI 生成</span>
            </div>
            {analysis?.summary && <div><p className="text-xs font-semibold text-gray-500 mb-1">會議摘要</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{analysis.summary}</p></div>}
            {analysis?.keyNumbers && <div><p className="text-xs font-semibold text-gray-500 mb-1">關鍵數字</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{analysis.keyNumbers}</p></div>}
            {analysis?.sentiment && <div><p className="text-xs font-semibold text-gray-500 mb-1">管理層態度</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{analysis.sentiment}</p></div>}
            {analysis?.qaHighlights && <div><p className="text-xs font-semibold text-gray-500 mb-1">重要 Q&A</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{analysis.qaHighlights}</p></div>}
            {analysis?.followUps && <div><p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">後續追蹤 <span className="text-xs bg-orange-100 text-orange-600 px-1.5 rounded">需研究員確認</span></p><p className="text-sm text-gray-700 whitespace-pre-wrap">{analysis.followUps}</p></div>}
          </div>
        )}

        {/* ── Analyst notes ── */}
        {showNotes && (
          <div>
            <SectionHeader title="研究員筆記" />
            <div className="mt-3">
              <AnalystNoteBlock
                meetingId={id}
                notes={notes}
                onAdd={addNote}
                onUpdate={updateNote}
                onDelete={deleteNote}
              />
            </div>
          </div>
        )}

        {/* ── Transcript ── */}
        {transcript && transcript.segments.length > 0 && (
          <div>
            <SectionHeader title="逐字稿" />
            <div className="mt-3">
              <TranscriptViewer segments={transcript.segments} audioRef={audioRef} />
            </div>
          </div>
        )}

        {transcript && transcript.segments.length === 0 && transcript.fullText && (
          <div>
            <SectionHeader title="逐字稿" />
            <p className="mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{transcript.fullText}</p>
          </div>
        )}
      </main>

      {/* ── Delete confirm ── */}
      {showDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">刪除會議紀錄？</h3>
            <p className="text-sm text-gray-500">此操作不可復原，音檔與逐字稿將一併刪除。</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium">取消</button>
              <button onClick={handleDelete} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-medium">確認刪除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
