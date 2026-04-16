'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

type ProcessStatus = 'uploading' | 'transcribing' | 'analyzing' | 'completed' | 'failed';

interface StepConfig {
  key: ProcessStatus[];
  label: string;
  detail: string;
}

const STEPS: StepConfig[] = [
  {
    key: ['uploading'],
    label: '上傳錄音檔',
    detail: '正在上傳至伺服器',
  },
  {
    key: ['transcribing'],
    label: '語音轉文字',
    detail: 'Whisper AI 正在辨識語音',
  },
  {
    key: ['analyzing'],
    label: 'AI 分析',
    detail: 'Claude 正在整理重點摘要',
  },
];

function stepIndex(status: ProcessStatus): number {
  if (status === 'uploading') return 0;
  if (status === 'transcribing') return 1;
  if (status === 'analyzing') return 2;
  if (status === 'completed') return 3;
  return -1;
}

export default function ProcessingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [status, setStatus] = useState<ProcessStatus>('uploading');
  const [label, setLabel] = useState('上傳音檔中...');
  const [error, setError] = useState<string | null>(null);
  const [quickSummary, setQuickSummary] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    // Track whether we received a terminal event so we don't misread the
    // subsequent EventSource close as a network error.
    let terminated = false;

    const es = new EventSource(`/api/meetings/${id}/status`);

    es.onmessage = (e) => {
      const data = JSON.parse(e.data) as {
        status?: ProcessStatus;
        label?: string;
        errorMessage?: string;
        done?: boolean;
        error?: string;
        quickSummary?: string;
      };

      if (data.done) { es.close(); return; }
      if (data.error) { setError(data.error); es.close(); return; }
      if (data.status) setStatus(data.status);
      if (data.label) setLabel(data.label);
      if (data.quickSummary) setQuickSummary(data.quickSummary);

      if (data.status === 'completed') {
        terminated = true;
        es.close();
        setTimeout(() => router.push(`/meetings/${id}`), 800);
      }

      if (data.status === 'failed') {
        terminated = true;
        es.close();
        setError(data.errorMessage ?? '處理失敗，請重試');
      }
    };

    es.onerror = () => {
      es.close();
      // Ignore the close event that fires after we intentionally closed the stream
      if (!terminated) {
        setError('連線中斷，請重新整理頁面');
      }
    };

    return () => es.close();
  }, [id, router]);

  const current = stepIndex(status);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <h1 className="text-lg font-semibold text-gray-900">處理中</h1>
        <p className="text-sm text-gray-400 mt-0.5">您可以離開此頁面，處理會在背景進行</p>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
        {/* Steps */}
        <div className="w-full max-w-sm space-y-4">
          {STEPS.map((step, i) => {
            const isDone = current > i || status === 'completed';
            const isActive = current === i && status !== 'failed' && status !== 'completed';
            const isFailed = status === 'failed' && current === i;

            return (
              <div key={step.label} className="flex items-center gap-4">
                {/* Icon */}
                <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full border-2
                  ${isDone ? 'border-green-400 bg-green-50' : isActive ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white'}
                ">
                  {isDone && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {isActive && <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />}
                  {isFailed && <XCircle className="w-5 h-5 text-red-500" />}
                  {!isDone && !isActive && !isFailed && (
                    <span className="text-sm font-semibold text-gray-300">{i + 1}</span>
                  )}
                </div>

                {/* Text */}
                <div>
                  <p className={`font-medium text-sm ${isDone ? 'text-green-700' : isActive ? 'text-indigo-700' : 'text-gray-400'}`}>
                    {step.label}
                  </p>
                  {isActive && (
                    <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        {status !== 'failed' && (
          <div className="w-full max-w-sm">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                style={{ width: `${status === 'completed' ? 100 : (current / 3) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 text-right mt-1">
              {status === 'completed' ? '完成' : `步驟 ${current + 1} / 3`}
            </p>
          </div>
        )}

        {/* Quick summary preview (Phase 1 done) */}
        {quickSummary && status !== 'completed' && status !== 'failed' && (
          <div className="w-full max-w-sm border-l-4 border-indigo-500 bg-indigo-50/40 rounded-r-xl p-4">
            <p className="text-xs font-semibold text-indigo-500 mb-1">🤖 快速摘要（完整分析中…）</p>
            <p className="text-sm text-gray-700 leading-relaxed">{quickSummary}</p>
          </div>
        )}

        {/* Success */}
        {status === 'completed' && (
          <div className="flex flex-col items-center gap-2 text-center">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="font-semibold text-gray-800">處理完成！</p>
            <p className="text-sm text-gray-400">正在跳轉至會議詳情…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="w-full max-w-sm bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm font-medium text-red-700">處理失敗</p>
            </div>
            <p className="text-xs text-red-600">{error}</p>
            <button
              onClick={() => router.push(`/meetings/${id}`)}
              className="w-full py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium"
            >
              查看詳情
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
