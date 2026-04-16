'use client';

import { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  volume: number; // 0–1
  active: boolean;
}

const BAR_COUNT = 20;

export function AudioWaveform({ volume, active }: AudioWaveformProps) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const frameRef = useRef<number | null>(null);
  const historyRef = useRef<number[]>(Array(BAR_COUNT).fill(0));

  useEffect(() => {
    if (!active) {
      historyRef.current = Array(BAR_COUNT).fill(0);
      barsRef.current.forEach((bar) => {
        if (bar) bar.style.height = '4px';
      });
      return;
    }

    const animate = () => {
      // Shift history and push current volume
      historyRef.current = [...historyRef.current.slice(1), volume];

      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        const v = historyRef.current[i];
        // Add slight randomness to neighbouring bars for organic look
        const noise = 1 + (Math.random() - 0.5) * 0.3;
        const heightPct = Math.min(100, Math.max(8, v * noise * 200));
        bar.style.height = `${heightPct}%`;
      });

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [volume, active]);

  return (
    <div className="flex items-center justify-center gap-[3px] h-12 w-full px-4">
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { barsRef.current[i] = el; }}
          className="flex-1 rounded-full transition-none"
          style={{
            height: '4px',
            backgroundColor: active ? '#6366f1' : '#d1d5db',
            minHeight: '4px',
            maxHeight: '100%',
          }}
        />
      ))}
    </div>
  );
}
