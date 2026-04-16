'use client';

import type { FinancialDataItem } from '@/lib/analysis-types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function ChangeChip({ change }: { change?: string }) {
  if (!change) return null;
  const isUp = change.startsWith('+') || change.toLowerCase().includes('↑');
  const isDown = change.startsWith('-') || change.toLowerCase().includes('↓');
  return (
    <span
      className={[
        'inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full',
        isUp ? 'bg-green-100 text-green-700' : isDown ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600',
      ].join(' ')}
    >
      {isUp ? <TrendingUp className="w-3 h-3" /> : isDown ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      {change}
    </span>
  );
}

interface Props {
  items: FinancialDataItem[];
  onSeek?: (timestamp: number) => void;
}

export function FinancialDataGrid({ items, onSeek }: Props) {
  if (!items.length) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
      {items.map((item, i) => (
        <div
          key={i}
          onClick={() => item.timestamp !== undefined && onSeek?.(item.timestamp)}
          className={[
            'shrink-0 w-36 bg-white border border-gray-200 rounded-xl p-3 space-y-1.5',
            item.timestamp !== undefined && onSeek ? 'cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all' : '',
          ].join(' ')}
        >
          <p className="text-xs text-gray-500 truncate">{item.metric}</p>
          <p
            className={[
              'text-lg font-bold text-gray-900 leading-tight',
              item.source === 'implied' ? 'underline decoration-dotted' : '',
            ].join(' ')}
            title={item.source === 'implied' ? '此數字為推算，非管理層直接說出' : undefined}
          >
            {item.value}
          </p>
          <div className="space-y-0.5">
            <ChangeChip change={item.change} />
            {item.vsGuidance && (
              <p className="text-xs text-gray-400 leading-tight">{item.vsGuidance}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
