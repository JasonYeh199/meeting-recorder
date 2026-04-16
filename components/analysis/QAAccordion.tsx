'use client';

import { useState } from 'react';
import type { QAItem } from '@/lib/analysis-types';
import { ChevronDown, ChevronUp } from 'lucide-react';

const IMPORTANCE_CONFIG = {
  high:   { label: '高', cls: 'bg-red-100 text-red-700' },
  medium: { label: '中', cls: 'bg-amber-100 text-amber-700' },
  low:    { label: '低', cls: 'bg-gray-100 text-gray-500' },
};

const CATEGORY_LABELS: Record<string, string> = {
  revenue_guidance: '營收指引',
  margin:           '毛利率',
  capacity:         '產能',
  demand:           '需求展望',
  competition:      '競爭態勢',
  technology:       '技術/產品',
  capex:            '資本支出',
  dividend:         '股利政策',
  management:       '管理層',
  other:            '其他',
};

interface Props {
  items: QAItem[];
  onSeek?: (timestamp: number) => void;
}

export function QAAccordion({ items, onSeek }: Props) {
  const [expanded, setExpanded] = useState<number | null>(0);

  // Show high first, then medium
  const sorted = [...items]
    .filter((q) => q.importance !== 'low')
    .sort((a, b) => (a.importance === 'high' ? -1 : b.importance === 'high' ? 1 : 0));

  if (!sorted.length) return null;

  return (
    <div className="space-y-2">
      {sorted.map((item, i) => {
        const imp = IMPORTANCE_CONFIG[item.importance];
        const isOpen = expanded === i;
        return (
          <div key={i} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <button
              className="w-full flex items-start gap-3 px-4 py-3 text-left"
              onClick={() => setExpanded(isOpen ? null : i)}
            >
              <span className={`shrink-0 mt-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${imp.cls}`}>
                {imp.label}
              </span>
              <span className="flex-1 text-sm font-medium text-gray-800 leading-snug">
                {item.question}
              </span>
              {isOpen ? (
                <ChevronUp className="shrink-0 w-4 h-4 text-gray-400 mt-0.5" />
              ) : (
                <ChevronDown className="shrink-0 w-4 h-4 text-gray-400 mt-0.5" />
              )}
            </button>

            {isOpen && (
              <div className="px-4 pb-3 border-t border-gray-100 space-y-2">
                <p className="text-sm text-gray-700 leading-relaxed mt-2">{item.answer}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {CATEGORY_LABELS[item.category] ?? item.category}
                  </span>
                  {item.timestamp !== undefined && onSeek && (
                    <button
                      onClick={() => onSeek(item.timestamp!)}
                      className="text-xs text-indigo-500 underline underline-offset-2"
                    >
                      跳至音檔
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
