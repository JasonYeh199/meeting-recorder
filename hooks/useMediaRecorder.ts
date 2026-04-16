'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export type RecordingState = 'idle' | 'recording' | 'paused';

interface UseMediaRecorderOptions {
  onStop?: (blob: Blob, durationSeconds: number) => void;
}

export function useMediaRecorder({ onStop }: UseMediaRecorderOptions = {}) {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0); // seconds
  const [volume, setVolume] = useState(0); // 0–1
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0); // seconds accumulated before pauses
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopVolumeMonitor = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, []);

  const monitorVolume = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.fftSize);

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      setVolume(Math.sqrt(sum / data.length));
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio analyser for volume visualisation
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Prefer mp4 (iOS), fallback to webm
      const mimeType = MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const finalDuration = accumulatedRef.current + (Date.now() - startTimeRef.current) / 1000;
        onStop?.(blob, Math.round(finalDuration));
        stopTimer();
        stopVolumeMonitor();
        setVolume(0);
        stream.getTracks().forEach((t) => t.stop());
        releaseWakeLock();
      };

      recorder.start(1000); // collect chunks every second
      startTimeRef.current = Date.now();
      accumulatedRef.current = 0;
      setState('recording');

      timerRef.current = setInterval(() => {
        setDuration(
          Math.round(accumulatedRef.current + (Date.now() - startTimeRef.current) / 1000)
        );
      }, 500);

      monitorVolume();

      // Keep screen on
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen').catch(() => null);
      }
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? '麥克風權限被拒絕，請在瀏覽器設定中允許麥克風存取。'
          : '無法啟動錄音，請確認裝置麥克風正常。';
      setError(msg);
    }
  }, [onStop, stopTimer, stopVolumeMonitor, monitorVolume, releaseWakeLock]);

  const pause = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      accumulatedRef.current += (Date.now() - startTimeRef.current) / 1000;
      stopTimer();
      stopVolumeMonitor();
      setState('paused');
    }
  }, [stopTimer, stopVolumeMonitor]);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      startTimeRef.current = Date.now();
      setState('recording');

      timerRef.current = setInterval(() => {
        setDuration(
          Math.round(accumulatedRef.current + (Date.now() - startTimeRef.current) / 1000)
        );
      }, 500);

      monitorVolume();
    }
  }, [monitorVolume]);

  const stop = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      (mediaRecorderRef.current.state === 'recording' ||
        mediaRecorderRef.current.state === 'paused')
    ) {
      // If paused, final duration already accumulated — just stop
      if (mediaRecorderRef.current.state === 'paused') {
        // duration already in accumulatedRef
      } else {
        accumulatedRef.current += (Date.now() - startTimeRef.current) / 1000;
      }
      mediaRecorderRef.current.stop();
      setState('idle');
      setDuration(0);
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      stopVolumeMonitor();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      releaseWakeLock();
    };
  }, [stopTimer, stopVolumeMonitor, releaseWakeLock]);

  return { state, duration, volume, error, start, pause, resume, stop };
}
