'use client';

import { useState, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';

interface Segment {
  start: number;
  end: number;
  speaker?: string;
  text: string;
}

interface TranscriptViewerProps {
  segments: Segment[];
  audioRef?: React.RefObject<HTMLAudioElement | null>;
}

function pad(n: number) {
  return String(Math.floor(n)).padStart(2, '0');
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${pad(m)}:${pad(s)}`;
}

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export function TranscriptViewer({ segments, audioRef }: TranscriptViewerProps) {
  const [query, setQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{ segmentIndex: number; x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const seekTo = useCallback(
    (start: number) => {
      if (audioRef?.current) {
        audioRef.current.currentTime = start;
        audioRef.current.play().catch(() => {});
      }
    },
    [audioRef]
  );

  const handleLongPressStart = (index: number, e: React.TouchEvent | React.MouseEvent) => {
    longPressTimerRef.current = setTimeout(() => {
      const touch = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);
      setContextMenu({ segmentIndex: index, x: touch.clientX, y: touch.clientY });
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const filtered = query.trim()
    ? segments.filter((s) => s.text.toLowerCase().includes(query.toLowerCase()))
    : segments;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="搜尋逐字稿..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {/* Segments */}
      <div className="space-y-3">
        {filtered.map((seg, i) => (
          <div
            key={i}
            className="cursor-pointer active:bg-indigo-50 rounded-lg p-2 -mx-2 transition-colors"
            onClick={() => seekTo(seg.start)}
            onTouchStart={(e) => handleLongPressStart(i, e)}
            onTouchEnd={handleLongPressEnd}
            onMouseDown={(e) => handleLongPressStart(i, e)}
            onMouseUp={handleLongPressEnd}
            onMouseLeave={handleLongPressEnd}
          >
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-xs font-mono text-indigo-500 shrink-0">
                {formatTime(seg.start)}
              </span>
              {seg.speaker && (
                <span className="text-xs font-semibold text-gray-500">{seg.speaker}</span>
              )}
            </div>
            <p className="text-sm text-gray-800 leading-relaxed">
              {highlight(seg.text, query)}
            </p>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">找不到符合的內容</p>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
          style={{ top: contextMenu.y, left: Math.min(contextMenu.x, window.innerWidth - 180) }}
          onClick={() => setContextMenu(null)}
        >
          {[
            { label: '加入筆記', icon: '📝' },
            { label: '標記重點', icon: '⭐' },
            { label: '複製文字', icon: '📋' },
          ].map(({ label, icon }) => (
            <button
              key={label}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 min-w-[160px]"
              onClick={() => {
                if (label === '複製文字' && contextMenu) {
                  const seg = segments[contextMenu.segmentIndex];
                  if (seg) navigator.clipboard.writeText(seg.text).catch(() => {});
                }
                setContextMenu(null);
              }}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}

      {contextMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
      )}
    </div>
  );
}
