'use client';

interface RecordingTimerProps {
  seconds: number;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function RecordingTimer({ seconds }: RecordingTimerProps) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const display = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;

  // Rough estimate: ~1MB/min for compressed audio
  const mb = ((seconds / 60) * 1).toFixed(1);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-4xl font-mono font-semibold tabular-nums tracking-tight text-gray-800">
        {display}
      </span>
      <span className="text-sm text-gray-400">預估 {mb} MB</span>
    </div>
  );
}
