'use client';

import Link from 'next/link';

interface MeetingCardProps {
  id: string;
  title: string;
  company: string;
  type: 'broker_seminar' | 'company_visit' | 'earnings_call' | 'other';
  recordedAt: string; // ISO string
  duration: number; // seconds
  status: 'uploading' | 'transcribing' | 'analyzing' | 'completed' | 'failed';
  summaryPreview?: string;
}

const TYPE_LABELS: Record<string, string> = {
  broker_seminar: '券商座談',
  company_visit: '拜訪公司',
  earnings_call: '法說會',
  other: '其他',
};

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  uploading: { label: '上傳中', className: 'bg-blue-100 text-blue-700' },
  transcribing: { label: '轉錄中', className: 'bg-yellow-100 text-yellow-700' },
  analyzing: { label: 'AI 分析中', className: 'bg-purple-100 text-purple-700' },
  completed: { label: '已完成', className: 'bg-green-100 text-green-700' },
  failed: { label: '失敗', className: 'bg-red-100 text-red-700' },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function MeetingCard({
  id, title, company, type, recordedAt, duration, status, summaryPreview,
}: MeetingCardProps) {
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.other;

  return (
    <Link href={`/meetings/${id}`} className="block">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 active:bg-gray-50 transition-colors">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{title}</h3>
            {company && <p className="text-sm text-gray-500 truncate">{company}</p>}
          </div>
          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.className}`}>
            {statusCfg.label}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
          <span>{formatDate(recordedAt)}</span>
          {duration > 0 && <span>{formatDuration(duration)}</span>}
          <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
            {TYPE_LABELS[type] ?? '其他'}
          </span>
        </div>

        {status === 'completed' && summaryPreview && (
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{summaryPreview}</p>
        )}
      </div>
    </Link>
  );
}
