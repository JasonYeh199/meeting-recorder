'use client';

import { useState } from 'react';
import type { HistoricalComparison } from '@/lib/analysis-types';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

interface Props {
  data: HistoricalComparison;
  lastMeetingDate: string;
}

export function ComparisonSummaryCard({ data, lastMeetingDate }: Props) {
  const [showDetail, setShowDetail] = useState(false);

  const ups = data.financialChanges.filter((c) => c.direction === 'up' && c.significance === 'significant').length;
  const downs = data.financialChanges.filter((c) => c.direction === 'down' && c.significance === 'significant').length;
  const sentimentChanges = data.sentimentShifts.filter((s) => s.changed).length;

  const dateStr = new Date(lastMeetingDate).toLocaleDateString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });

  return (
    <div className="border border-indigo-100 bg-indigo-50/30 rounded-xl overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2">
        <RefreshCw className="w-4 h-4 text-indigo-400" />
        <span className="text-sm font-semibold text-indigo-700">vs 上次會議（{dateStr}）</span>
      </div>

      <div className="px-4 pb-3 space-y-2">
        {/* Quick stats */}
        <div className="flex flex-wrap gap-2">
          {ups > 0 && (
            <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              <TrendingUp className="w-3 h-3" /> {ups} 項改善
            </span>
          )}
          {downs > 0 && (
            <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
              <TrendingDown className="w-3 h-3" /> {downs} 項下修
            </span>
          )}
          {sentimentChanges > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
              態度轉變 {sentimentChanges} 項
            </span>
          )}
          {data.newTopics.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              新議題 {data.newTopics.length} 項
            </span>
          )}
        </div>

        <p className="text-sm text-gray-700 leading-relaxed">{data.comparisonSummary}</p>

        <button
          onClick={() => setShowDetail(!showDetail)}
          className="flex items-center gap-1 text-xs text-indigo-600 font-medium"
        >
          {showDetail ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showDetail ? '收起' : '查看完整比對'}
        </button>
      </div>

      {showDetail && (
        <div className="border-t border-indigo-100 px-4 py-3 space-y-4 bg-white/60">
          {/* Financial changes */}
          {data.financialChanges.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">財務數字變化</h4>
              <div className="space-y-1">
                {data.financialChanges.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600 w-32 shrink-0 truncate">{c.metric}</span>
                    <span className="text-gray-400 text-xs">{c.lastTime}</span>
                    <span className="text-gray-400">→</span>
                    <span className={c.direction === 'up' ? 'text-green-700 font-medium' : c.direction === 'down' ? 'text-red-700 font-medium' : 'text-gray-700'}>
                      {c.thisTime}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New topics */}
          {data.newTopics.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">新議題</h4>
              <div className="flex flex-wrap gap-1.5">
                {data.newTopics.map((t, i) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Disappeared topics */}
          {data.disappearedTopics.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">消失議題</h4>
              <div className="flex flex-wrap gap-1.5">
                {data.disappearedTopics.map((t, i) => (
                  <span key={i} className="text-xs bg-gray-50 text-gray-500 border border-gray-200 px-2 py-1 rounded-full line-through">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up resolutions */}
          {data.followUpResolutions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">上次追蹤事項後續</h4>
              <div className="space-y-2">
                {data.followUpResolutions.map((r, i) => (
                  <div key={i} className="text-sm">
                    <p className="text-gray-600">{r.originalItem}</p>
                    <p className={`text-xs mt-0.5 ${r.resolved ? 'text-green-600' : 'text-gray-400'}`}>
                      {r.resolved ? `✓ ${r.resolution ?? '已解答'}` : '尚未解答'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
