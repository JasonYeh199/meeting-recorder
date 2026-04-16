'use client';

import { useState } from 'react';
import type { SentimentItem, SentimentType } from '@/lib/analysis-types';

const SENTIMENT_CONFIG: Record<SentimentType, { label: string; cls: string }> = {
  positive: { label: '正面', cls: 'bg-green-100 text-green-700' },
  cautious: { label: '謹慎', cls: 'bg-orange-100 text-orange-700' },
  neutral:  { label: '中立', cls: 'bg-gray-100 text-gray-600' },
  evasive:  { label: '迴避', cls: 'bg-red-100 text-red-600' },
  negative: { label: '負面', cls: 'bg-red-200 text-red-700' },
};

interface Props {
  items: SentimentItem[];
  onSeek?: (timestamp: number) => void;
}

export function SentimentList({ items, onSeek }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (!items.length) return null;

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const cfg = SENTIMENT_CONFIG[item.sentiment] ?? SENTIMENT_CONFIG.neutral;
        const isOpen = expanded === i;
        return (
          <div key={i} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              onClick={() => setExpanded(isOpen ? null : i)}
            >
              <span className="flex-1 text-sm font-medium text-gray-800">{item.topic}</span>
              <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.cls}`}>
                {cfg.label}
              </span>
            </button>

            {isOpen && (
              <div className="px-4 pb-3 border-t border-gray-100">
                <p className="text-sm text-gray-600 italic leading-relaxed mt-2">
                  「{item.evidence}」
                </p>
                {item.timestamp !== undefined && onSeek && (
                  <button
                    onClick={() => onSeek(item.timestamp!)}
                    className="mt-2 text-xs text-indigo-500 underline underline-offset-2"
                  >
                    跳至音檔時間點
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
