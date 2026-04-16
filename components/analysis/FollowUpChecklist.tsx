'use client';

import { useState, useEffect } from 'react';
import type { FollowUpItem } from '@/lib/analysis-types';

interface Props {
  items: FollowUpItem[];
  meetingId: string;
}

export function FollowUpChecklist({ items, meetingId }: Props) {
  const storageKey = `mr_followup_${meetingId}`;
  const [checked, setChecked] = useState<boolean[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setChecked(JSON.parse(saved) as boolean[]);
      } else {
        setChecked(new Array(items.length).fill(false));
      }
    } catch {
      setChecked(new Array(items.length).fill(false));
    }
  }, [storageKey, items.length]);

  const toggle = (i: number) => {
    const next = [...checked];
    next[i] = !next[i];
    setChecked(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  };

  if (!items.length) return null;

  const urgentItems = items.filter((it) => it.priority === 'urgent');
  const normalItems = items.filter((it) => it.priority === 'normal');

  const renderItem = (item: FollowUpItem, originalIndex: number) => (
    <div
      key={originalIndex}
      className="flex items-start gap-3 py-2"
    >
      <button
        onClick={() => toggle(originalIndex)}
        className={[
          'shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
          checked[originalIndex]
            ? 'bg-indigo-500 border-indigo-500'
            : 'border-gray-300 bg-white',
        ].join(' ')}
        aria-label="切換完成狀態"
      >
        {checked[originalIndex] && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${checked[originalIndex] ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {item.item}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {item.deadline && (
            <span className="text-xs text-gray-400">📅 {item.deadline}</span>
          )}
          <span className="text-xs text-orange-500 font-medium">[需研究員確認]</span>
        </div>
      </div>
      {item.priority === 'urgent' && (
        <span className="shrink-0 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">緊急</span>
      )}
    </div>
  );

  return (
    <div className="space-y-1 divide-y divide-gray-100">
      {urgentItems.map((item) => {
        const idx = items.indexOf(item);
        return renderItem(item, idx);
      })}
      {normalItems.map((item) => {
        const idx = items.indexOf(item);
        return renderItem(item, idx);
      })}
    </div>
  );
}
