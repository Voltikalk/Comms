import { useState, useRef, useEffect } from 'react';
import { createAudioLiveAnalyser, normalizeWaveform, type AudioLiveAnalyser } from '../lib/audio-waveform';
import type { HapticFeedbackType } from '../types/platform.types';

export interface UseVoiceRecordingOptions {
  sendMessage: (text: string, replyToId?: string, file?: any) => void;
  triggerHaptic?: (type?: HapticFeedbackType) => void;
  inputActionMode: 'voice' | 'video';
}

export interface RecordedVoicePreview {
  blob: Blob;
  url: string;
  waveform: number[];
  duration: number;
  mimeType: string;
}

export const useVoiceRecording = ({
  sendMessage,
  triggerHaptic,
  inputActionMode,
}: UseVoiceRecordingOptions) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [liveVolumeLevels, setLiveVolumeLevels] = useState<number[]>([]);
  const [isVoiceLocked, setIsVoiceLocked] = useState(false);
  const [isVoicePaused, setIsVoicePaused] = useState(false);
  const [voiceDragOffset, setVoiceDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [recordedVoicePreview, setRecordedVoicePreview] = useState<RecordedVoicePreview | null>(null);

  const voiceStopActionRef = useRef<'send' | 'preview' | 'cancel'>('send');
  const voicePointerStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isVoiceHoldingRef = useRef(false);
  const voiceStartTimeRef = useRef<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<any>(null);
  const audioAnalyserRef = useRef<AudioLiveAnalyser | null>(null);
  const rawAudioAmplitudesRef = useRef<number[]>([]);
  const audioVolumeIntervalRef = useRef<any>(null);

  // Audio Note recording with Web Audio Waveform Capture & Slide-to-Cancel / Lock / Preview
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
        else if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else if (MediaRecorder.isTypeSupported('audio/aac')) mimeType = 'audio/aac';
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      rawAudioAmplitudesRef.current = [];
      setLiveVolumeLevels([]);
      setIsVoiceLocked(false);
      setIsVoicePaused(false);
      setVoiceDragOffset({ x: 0, y: 0 });
      setRecordedVoicePreview(null);
      voiceStopActionRef.current = 'send';
      voiceStartTimeRef.current = Date.now();

      // Initialize real-time Web Audio Analyser
      const analyser = createAudioLiveAnalyser(stream);
      audioAnalyserRef.current = analyser;

      if (analyser) {
        audioVolumeIntervalRef.current = setInterval(() => {
          const vol = analyser.getInstantVolume();
          rawAudioAmplitudesRef.current.push(vol);
          setLiveVolumeLevels((prev) => [...prev.slice(-15), vol]);
        }, 90);
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (audioVolumeIntervalRef.current) {
          clearInterval(audioVolumeIntervalRef.current);
          audioVolumeIntervalRef.current = null;
        }
        audioAnalyserRef.current?.close();
        audioAnalyserRef.current = null;

        const action = voiceStopActionRef.current;
        const actualMimeType = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        const normalizedWaveform = normalizeWaveform(rawAudioAmplitudesRef.current, 30, 8, 100);
        const duration = Math.max(1, recordTime);

        if (action === 'send') {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            const extension = actualMimeType.includes('mp4')
              ? 'mp4'
              : actualMimeType.includes('ogg')
              ? 'ogg'
              : actualMimeType.includes('aac')
              ? 'aac'
              : 'webm';
            sendMessage('', undefined, {
              name: `Голосовое сообщение.${extension}`,
              type: 'audio',
              data: base64,
              size: audioBlob.size,
              rawBlob: audioBlob,
              waveform: normalizedWaveform,
              duration,
            });
          };
          reader.readAsDataURL(audioBlob);
          stream.getTracks().forEach((track) => track.stop());
        } else if (action === 'preview') {
          const previewUrl = URL.createObjectURL(audioBlob);
          setRecordedVoicePreview({
            blob: audioBlob,
            url: previewUrl,
            waveform: normalizedWaveform,
            duration,
            mimeType: actualMimeType,
          });
          stream.getTracks().forEach((track) => track.stop());
        } else {
          // action === 'cancel'
          stream.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordTime(0);

      recordIntervalRef.current = setInterval(() => {
        setRecordTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      console.error('Record microphone error:', err);
      alert('Не удалось получить доступ к микрофону.');
    }
  };

  const toggleVoicePause = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    if (mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      if (audioVolumeIntervalRef.current) clearInterval(audioVolumeIntervalRef.current);
      setIsVoicePaused(true);
      triggerHaptic?.('light');
    } else if (mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      recordIntervalRef.current = setInterval(() => {
        setRecordTime((t) => t + 1);
      }, 1000);
      if (audioAnalyserRef.current) {
        audioVolumeIntervalRef.current = setInterval(() => {
          const vol = audioAnalyserRef.current?.getInstantVolume() ?? 10;
          rawAudioAmplitudesRef.current.push(vol);
          setLiveVolumeLevels((prev) => [...prev.slice(-15), vol]);
        }, 90);
      }
      setIsVoicePaused(false);
      triggerHaptic?.('light');
    }
  };

  const stopRecording = (action: 'send' | 'preview' | 'cancel' = 'send') => {
    voiceStopActionRef.current = action;
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    if (audioVolumeIntervalRef.current) {
      clearInterval(audioVolumeIntervalRef.current);
      audioVolumeIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsVoiceLocked(false);
    setIsVoicePaused(false);
    setVoiceDragOffset({ x: 0, y: 0 });
    setLiveVolumeLevels([]);
  };

  const sendRecordedVoicePreview = () => {
    if (!recordedVoicePreview) return;
    const { blob, mimeType, waveform, duration, url } = recordedVoicePreview;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const extension = mimeType.includes('mp4')
        ? 'mp4'
        : mimeType.includes('ogg')
        ? 'ogg'
        : mimeType.includes('aac')
        ? 'aac'
        : 'webm';
      sendMessage('', undefined, {
        name: `Голосовое сообщение.${extension}`,
        type: 'audio',
        data: base64,
        size: blob.size,
        rawBlob: blob,
        waveform,
        duration,
      });
      URL.revokeObjectURL(url);
      setRecordedVoicePreview(null);
    };
    reader.readAsDataURL(blob);
  };

  const cancelRecordedVoicePreview = () => {
    if (recordedVoicePreview) {
      URL.revokeObjectURL(recordedVoicePreview.url);
      setRecordedVoicePreview(null);
    }
  };

  const handleVoicePointerDown = (e: React.PointerEvent) => {
    if (inputActionMode !== 'voice') return;
    if (e.button !== 0) return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    voicePointerStartPosRef.current = { x: e.clientX, y: e.clientY };
    isVoiceHoldingRef.current = true;
    startRecording();
  };

  const handleVoicePointerMove = (e: React.PointerEvent) => {
    if (!isVoiceHoldingRef.current || !voicePointerStartPosRef.current || isVoiceLocked) return;
    const dx = e.clientX - voicePointerStartPosRef.current.x;
    const dy = e.clientY - voicePointerStartPosRef.current.y;
    setVoiceDragOffset({ x: dx, y: dy });

    if (dx < -80) {
      triggerHaptic?.('warning');
      isVoiceHoldingRef.current = false;
      stopRecording('cancel');
      return;
    }

    if (dy < -55) {
      triggerHaptic?.('success');
      setIsVoiceLocked(true);
      isVoiceHoldingRef.current = false;
      setVoiceDragOffset({ x: 0, y: 0 });
    }
  };

  const handleVoicePointerUp = (e: React.PointerEvent) => {
    if (!isVoiceHoldingRef.current) return;
    isVoiceHoldingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (!isVoiceLocked && isRecording) {
      const elapsedMs = Date.now() - voiceStartTimeRef.current;
      if (elapsedMs < 600) {
        setIsVoiceLocked(true);
      } else {
        stopRecording('send');
      }
    }
  };

  const formatRecordTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      if (audioVolumeIntervalRef.current) clearInterval(audioVolumeIntervalRef.current);
      audioAnalyserRef.current?.close();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return {
    isRecording,
    recordTime,
    liveVolumeLevels,
    isVoiceLocked,
    isVoicePaused,
    voiceDragOffset,
    recordedVoicePreview,
    startRecording,
    toggleVoicePause,
    stopRecording,
    sendRecordedVoicePreview,
    cancelRecordedVoicePreview,
    handleVoicePointerDown,
    handleVoicePointerMove,
    handleVoicePointerUp,
    formatRecordTime,
  };
};
