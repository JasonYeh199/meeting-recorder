import Link from 'next/link';
import { Plus, Mic, Upload } from 'lucide-react';
import { getDb } from '@/lib/db/client';
import { meetings } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { MeetingCard } from '@/components/meeting/MeetingCard';

type FilterType = 'all' | 'broker_seminar' | 'company_visit' | 'earnings_call' | 'other';

const FILTER_LABELS: { value: FilterType; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'broker_seminar', label: '券商座談' },
  { value: 'company_visit', label: '拜訪公司' },
  { value: 'earnings_call', label: '法說會' },
];

interface SearchParams {
  q?: string;
  type?: FilterType;
}

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q, type: filterType = 'all' } = await searchParams;

  const db = getDb();
  let rows = await db.select().from(meetings).orderBy(desc(meetings.createdAt)).limit(200);

  if (filterType !== 'all') {
    rows = rows.filter((r) => r.type === filterType);
  }
  if (q) {
    const lower = q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(lower) || r.company.toLowerCase().includes(lower)
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">會議紀錄</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/upload"
              className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium"
            >
              <Upload className="w-4 h-4" />
              上傳
            </Link>
            <Link
              href="/record"
              className="flex items-center gap-1.5 bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm font-medium"
            >
              <Mic className="w-4 h-4" />
              錄音
            </Link>
          </div>
        </div>

        {/* Search */}
        <form method="GET" action="/meetings">
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="搜尋會議、公司名稱…"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </form>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
          {FILTER_LABELS.map((f) => (
            <Link
              key={f.value}
              href={`/meetings?${q ? `q=${encodeURIComponent(q)}&` : ''}type=${f.value}`}
              className={[
                'shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                filterType === f.value
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600',
              ].join(' ')}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </header>

      {/* List */}
      <main className="flex-1 p-4 space-y-3 pb-24">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Mic className="w-12 h-12 text-gray-300" />
            <p className="text-gray-400 text-sm">尚無會議紀錄</p>
            <Link
              href="/record"
              className="bg-indigo-500 text-white px-6 py-2.5 rounded-full text-sm font-medium"
            >
              開始第一次錄音
            </Link>
          </div>
        ) : (
          rows.map((m) => (
            <MeetingCard
              key={m.id}
              id={m.id}
              title={m.title}
              company={m.company}
              type={m.type as 'broker_seminar' | 'company_visit' | 'earnings_call' | 'other'}
              recordedAt={m.recordedAt}
              duration={m.duration}
              status={m.status as 'uploading' | 'transcribing' | 'analyzing' | 'completed' | 'failed'}
            />
          ))
        )}
      </main>

      {/* FAB */}
      <Link
        href="/record"
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-500 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label="新增錄音"
      >
        <Plus className="w-7 h-7" />
      </Link>
    </div>
  );
}
