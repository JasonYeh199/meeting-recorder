'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { UploadDropzone } from '@/components/upload/UploadDropzone';
import { FilePreview } from '@/components/upload/FilePreview';
import { MeetingMetaForm } from '@/components/upload/MeetingMetaForm';
import { UploadProgress } from '@/components/upload/UploadProgress';
import { ResumeUploadBanner } from '@/components/upload/ResumeUploadBanner';
import {
  useChunkedUpload,
  getPersistedUpload,
  clearPersistedUpload,
  type MeetingMeta,
  type PersistedUploadState,
} from '@/hooks/useChunkedUpload';

type Step = 'select' | 'form' | 'uploading';

export default function UploadPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('select');
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<MeetingMeta | null>(null);
  const [pendingUpload, setPendingUpload] = useState<PersistedUploadState | null>(null);
  const [resumeMode, setResumeMode] = useState(false);

  // Detect persisted upload on mount
  useEffect(() => {
    const saved = getPersistedUpload();
    if (saved) setPendingUpload(saved);
  }, []);

  const handleComplete = useCallback(
    (meetingId: string) => {
      router.push(`/processing/${meetingId}`);
    },
    [router]
  );

  const upload = useChunkedUpload(file, meta, { onComplete: handleComplete });

  // When file is selected in resume mode, validate and resume
  const handleResumeFileSelect = useCallback(
    (selected: File) => {
      if (!pendingUpload) return;
      if (
        selected.name !== pendingUpload.filename ||
        selected.size !== pendingUpload.filesize
      ) {
        alert('選擇的檔案與未完成的上傳不符，請選擇相同的檔案。');
        return;
      }
      setFile(selected);
      setResumeMode(false);
      // Resume will happen via useEffect below
    },
    [pendingUpload]
  );

  // After file is set in resume mode, trigger resume
  const didResume = useRef(false);
  useEffect(() => {
    if (file && pendingUpload && !didResume.current && upload.state === 'idle') {
      didResume.current = true;
      setStep('uploading');
      upload.resume();
    }
  }, [file, pendingUpload, upload]);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setStep('form');
  }, []);

  const handleMetaSubmit = useCallback(
    (m: MeetingMeta) => {
      setMeta(m);
      setStep('uploading');
    },
    []
  );

  // Start uploading once meta is set
  const uploadStarted = useRef(false);
  useEffect(() => {
    if (step === 'uploading' && meta && file && !pendingUpload && !uploadStarted.current) {
      uploadStarted.current = true;
      upload.start();
    }
  }, [step, meta, file, pendingUpload, upload]);

  const handleCancel = useCallback(async () => {
    await upload.cancel();
    uploadStarted.current = false;
    didResume.current = false;
    setFile(null);
    setMeta(null);
    setPendingUpload(null);
    setStep('select');
  }, [upload]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => (step === 'select' ? router.back() : setStep('select'))}
          className="p-1.5 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100"
          aria-label="返回"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">上傳音檔</h1>
          <p className="text-xs text-gray-400">
            {step === 'select' ? '選擇要分析的音檔' : step === 'form' ? '填寫會議資訊' : '上傳與處理中'}
          </p>
        </div>
      </header>

      <div className="flex-1 p-4 max-w-lg mx-auto w-full space-y-4">
        {/* Resume banner */}
        {pendingUpload && step === 'select' && !resumeMode && (
          <ResumeUploadBanner
            state={pendingUpload}
            onResume={() => setResumeMode(true)}
            onDismiss={() => {
              clearPersistedUpload();
              setPendingUpload(null);
            }}
          />
        )}

        {/* Step 1: File select */}
        {step === 'select' && (
          <div className="space-y-4">
            {resumeMode ? (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  請重新選擇「<span className="font-medium">{pendingUpload?.filename}</span>
                  」以繼續上傳
                </div>
                <UploadDropzone onFile={handleResumeFileSelect} />
              </div>
            ) : (
              <UploadDropzone onFile={handleFile} />
            )}
          </div>
        )}

        {/* Step 2: Meeting info form */}
        {step === 'form' && file && (
          <div className="space-y-4">
            <FilePreview file={file} onRemove={() => { setFile(null); setStep('select'); }} />
            <MeetingMetaForm
              initialDate={new Date(file.lastModified)}
              onSubmit={handleMetaSubmit}
            />
          </div>
        )}

        {/* Step 3: Uploading */}
        {step === 'uploading' && file && (
          <div className="space-y-4">
            <FilePreview file={file} onRemove={() => {}} />
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">上傳進度</h2>
              <UploadProgress
                progress={upload.progress}
                bytesUploaded={upload.bytesUploaded}
                totalBytes={file.size}
                state={upload.state as 'uploading' | 'paused' | 'completed' | 'failed'}
                error={upload.error}
                onPause={upload.pause}
                onResume={() => upload.resume()}
                onCancel={handleCancel}
              />
            </div>
            {upload.state === 'failed' && (
              <button
                onClick={() => {
                  uploadStarted.current = false;
                  upload.start();
                }}
                className="w-full py-3 rounded-xl bg-indigo-500 text-white font-semibold text-sm"
              >
                重試
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
