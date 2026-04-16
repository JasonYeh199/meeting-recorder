'use client';

interface AiSummaryBlockProps {
  summary: string;
  keyNumbers: string;
  sentiment: string;
  qaHighlights: string;
  followUps: string;
}

function Section({ title, content }: { title: string; content: string }) {
  if (!content?.trim()) return null;
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 mb-1">{title}</h4>
      <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{content}</div>
    </div>
  );
}

export function AiSummaryBlock({ summary, keyNumbers, sentiment, qaHighlights, followUps }: AiSummaryBlockProps) {
  return (
    <div className="relative border-l-4 border-indigo-500 bg-indigo-50/40 rounded-r-xl p-4 space-y-4">
      {/* AI label */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-gray-900">AI 摘要</h3>
        <span className="text-xs text-indigo-500 font-medium">🤖 AI 生成</span>
      </div>

      <Section title="會議摘要" content={summary} />
      <Section title="關鍵數字" content={keyNumbers} />
      <Section title="管理層態度" content={sentiment} />
      <Section title="重要 Q&A 摘錄" content={qaHighlights} />

      {followUps?.trim() && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
            後續追蹤事項
            <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-medium">
              需研究員確認
            </span>
          </h4>
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{followUps}</div>
        </div>
      )}
    </div>
  );
}
