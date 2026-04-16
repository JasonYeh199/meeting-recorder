import Anthropic from '@anthropic-ai/sdk';
import type { FullAnalysis, HistoricalComparison } from './analysis-types';

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY 未設定');
  return new Anthropic({ apiKey: key });
}

const MAX_CHARS = 30_000;

function truncateTranscript(text: string): string {
  if (text.length <= MAX_CHARS) return text;
  return text.slice(0, MAX_CHARS) + '\n\n[逐字稿過長，以上為前段內容]';
}

function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');
}

function stripMarkdownFence(raw: string): string {
  return raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
}

// ─── Phase 1: Quick summary (fast, non-streaming) ───────────────────────────

const QUICK_SUMMARY_SYSTEM = `你是專業的投資研究助理，服務台灣投信公司的股票分析師。

根據以下會議逐字稿，用繁體中文寫出 3-5 句的快速摘要，讓分析師在 30 秒內掌握本次會議的核心訊息。

要求：
- 第一句說明會議的主要議題
- 接著點出 1-2 個最重要的數字或事實
- 最後一句說明整體語氣或最值得關注的方向
- 不要有任何標題或列表，純段落文字
- 若有尚未公開的重要資訊，請在結尾標記 [含敏感資訊，請注意資訊管理]`;

export async function generateQuickSummary(
  transcript: string,
  meta: { title: string; company: string; type: string }
): Promise<string> {
  const client = getClient();
  const res = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 512,
    system: QUICK_SUMMARY_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `公司：${meta.company}\n會議：${meta.title}\n\n逐字稿：\n\n${truncateTranscript(transcript)}`,
      },
    ],
  });
  return extractText(res.content);
}

// ─── Phase 2: Full structured analysis (JSON) ────────────────────────────────

const FULL_ANALYSIS_SYSTEM = `你是專業的投資研究助理，服務台灣投信公司的股票分析師。

根據以下會議逐字稿，產出完整的結構化分析。
請嚴格以 JSON 格式回覆，不要有任何前言、後語或 Markdown 標記。

JSON 結構（欄位說明省略，請依下方規格產出）：
{
  "executiveSummary": "3段式完整摘要（繁體中文）",
  "financialData": [
    { "metric": "指標", "value": "數值", "change": "變化（選填）", "vsGuidance": "與指引比較（選填）", "source": "stated|implied", "timestamp": 秒數（選填） }
  ],
  "sentimentAnalysis": [
    { "topic": "議題", "sentiment": "positive|cautious|neutral|evasive|negative", "evidence": "原文片段", "timestamp": 秒數（選填） }
  ],
  "qaHighlights": [
    { "question": "提問（改寫去冗詞）", "answer": "回答摘要", "category": "revenue_guidance|margin|capacity|demand|competition|technology|capex|dividend|management|other", "importance": "high|medium|low", "timestamp": 秒數（選填） }
  ],
  "followUpItems": [
    { "item": "待確認事項", "deadline": "期限（選填）", "priority": "urgent|normal" }
  ],
  "risksAndOpportunities": [
    { "type": "risk|opportunity", "description": "描述", "timeframe": "short|medium|long" }
  ],
  "confidence": 0到100的整數,
  "warnings": ["警告訊息"]
}

分析規範：
1. financialData：只列出有明確數字的項目；直接說出=stated，計算/推算=implied
2. sentimentAnalysis：evidence 必須引用原文片段，不可憑空判斷
3. qaHighlights：只保留 importance 為 high 或 medium 的問答
4. followUpItems：專注在管理層承諾回答但尚未給出答案、或分析師需要進一步確認的項目
5. 所有涉及投資建議的內容，在 description 或 item 結尾加「[需研究員確認]」
6. confidence 低於 70 時，在 warnings 說明原因（如逐字稿有辨識錯誤）`;

export async function generateFullAnalysis(
  transcript: string,
  meta: { title: string; company: string; type: string },
  quickSummary: string
): Promise<FullAnalysis> {
  const client = getClient();
  const res = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system: FULL_ANALYSIS_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `公司：${meta.company}\n會議：${meta.title}\n\n快速摘要（供參考）：${quickSummary}\n\n逐字稿：\n\n${truncateTranscript(transcript)}`,
      },
    ],
  });

  const raw = stripMarkdownFence(extractText(res.content));

  try {
    return JSON.parse(raw) as FullAnalysis;
  } catch {
    return {
      executiveSummary: quickSummary,
      financialData: [],
      sentimentAnalysis: [],
      qaHighlights: [],
      followUpItems: [],
      risksAndOpportunities: [],
      confidence: 30,
      warnings: ['AI 回傳的 JSON 格式有誤，部分分析未能正確解析，建議重新分析'],
    };
  }
}

// ─── Historical comparison ────────────────────────────────────────────────────

const COMPARISON_SYSTEM = `你是專業的投資研究助理。以下是同一家公司兩次會議的結構化分析，請比較差異。
請嚴格以 JSON 格式回覆，不要有任何前言、後語或 Markdown 標記。

JSON 結構：
{
  "financialChanges": [
    { "metric": "指標", "thisTime": "本次值", "lastTime": "上次值", "direction": "up|down|flat|new", "significance": "significant|minor" }
  ],
  "sentimentShifts": [
    { "topic": "議題", "thisTime": "positive|cautious|neutral|evasive|negative", "lastTime": "同上", "changed": true|false }
  ],
  "newTopics": ["本次出現、上次沒有的議題"],
  "disappearedTopics": ["上次提到、本次未提的議題"],
  "followUpResolutions": [
    { "originalItem": "上次的追蹤事項", "resolved": true|false, "resolution": "本次的回答（選填）" }
  ],
  "comparisonSummary": "2-3句說明最大變化（繁體中文）"
}

比對重點：
1. 財務數字：只列出有實質變化的項目（>3% 視為 significant）
2. 態度變化：管理層對相同議題的立場是否轉變
3. 新議題：本次特別提到但上次沒有的議題
4. 消失議題：上次頻繁提到但本次完全未提的議題
5. 追蹤事項：上次標記的 followUpItems，本次有沒有得到解答`;

export async function compareAnalyses(
  currentAnalysis: FullAnalysis,
  previousAnalysis: FullAnalysis,
  previousMeetingId: string,
  previousMeetingDate: string,
  previousMeetingType: string
): Promise<HistoricalComparison | null> {
  try {
    const client = getClient();
    const res = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: COMPARISON_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `上次會議分析：\n${JSON.stringify(previousAnalysis, null, 2)}\n\n本次會議分析：\n${JSON.stringify(currentAnalysis, null, 2)}`,
        },
      ],
    });

    const raw = stripMarkdownFence(extractText(res.content));
    const diff = JSON.parse(raw) as Omit<HistoricalComparison, 'lastMeetingId' | 'lastMeetingDate' | 'lastMeetingType'>;

    return {
      lastMeetingId: previousMeetingId,
      lastMeetingDate: previousMeetingDate,
      lastMeetingType: previousMeetingType as HistoricalComparison['lastMeetingType'],
      ...diff,
    };
  } catch {
    return null;
  }
}

// ─── Legacy export (backward compat for any existing callers) ────────────────
export interface MeetingAnalysis {
  summary: string;
  keyNumbers: string;
  sentiment: string;
  qaHighlights: string;
  followUps: string;
}

/** @deprecated Use generateQuickSummary + generateFullAnalysis instead */
export async function analyzeMeeting(fullText: string): Promise<MeetingAnalysis> {
  const quickSummary = await generateQuickSummary(fullText, { title: '', company: '', type: '' });
  return {
    summary: quickSummary,
    keyNumbers: '',
    sentiment: '',
    qaHighlights: '',
    followUps: '',
  };
}
