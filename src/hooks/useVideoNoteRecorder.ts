import { useCallback, useEffect, useRef, useState } from 'react';

export const VIDEO_NOTE_MAX_SECONDS = 60;
const OUTPUT_SIZE = 480;
const MIN_SEND_SECONDS = 0.7;

export interface RecordedVideoNote {
  name: string;
  type: 'video_note';
  data: string;
  size: number;
  rawBlob: Blob;
  duration: number;
}

type Facing = 'user' | 'environment';
type Phase = 'idle' | 'starting' | 'recording';

interface Options {
  onRecorded: (file: RecordedVideoNote) => void;
  onError?: (message: string) => void;
}

const pickMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=avc1,mp4a',
    'video/mp4',
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || '';
};

/**
 * Records a square, centre-cropped video note.
 *
 * Frames are composited onto a 480×480 canvas and the canvas stream is recorded together
 * with the microphone track. That gives a properly square file regardless of the camera's
 * aspect ratio, and lets the camera be flipped mid-recording without restarting the
 * MediaRecorder (which can't survive a track swap). Falls back to recording the raw camera
 * stream where `canvas.captureStream` is unavailable.
 *
 * All timing lives in refs, so the 60 s auto-stop and the reported duration are never stale.
 */
export function useVideoNoteRecorder({ onRecorded, onError }: Options) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [facing, setFacing] = useState<Facing>('user');
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [canFlip, setCanFlip] = useState(false);

  const micStreamRef = useRef<MediaStream | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const camVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  const drawRef = useRef<number | null>(null);
  const facingRef = useRef<Facing>('user');
  const sendOnStopRef = useRef(false);
  const phaseRef = useRef<Phase>('idle');

  const onRecordedRef = useRef(onRecorded);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onRecordedRef.current = onRecorded;
    onErrorRef.current = onError;
  }, [onRecorded, onError]);

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const releaseDevices = useCallback(() => {
    if (tickRef.current !== null) window.clearInterval(tickRef.current);
    if (drawRef.current !== null) cancelAnimationFrame(drawRef.current);
    tickRef.current = null;
    drawRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    camStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    camStreamRef.current = null;
    if (camVideoRef.current) camVideoRef.current.srcObject = null;
    camVideoRef.current = null;
    canvasRef.current = null;
    recorderRef.current = null;
    setPreviewStream(null);
  }, []);

  const getCamera = (mode: Facing) =>
    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: mode,
        width: { ideal: 720 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 30 },
      },
    });

  const stop = useCallback((send: boolean) => {
    const recorder = recorderRef.current;
    if (phaseRef.current === 'idle') return;
    if (recorder) {
      // Already stopping → first decision wins (e.g. Enter + a focused Cancel button).
      if (recorder.state === 'inactive') return;
      sendOnStopRef.current = send;
      recorder.stop(); // onstop does the rest
      return;
    }
    // Still waiting for camera permission.
    releaseDevices();
    setPhaseBoth('idle');
  }, [releaseDevices]);

  const start = useCallback(async () => {
    if (phaseRef.current !== 'idle') return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      onErrorRef.current?.('Запись кружков требует HTTPS и поддержки камеры в браузере');
      return;
    }
    setPhaseBoth('starting');
    setElapsed(0);
    facingRef.current = 'user';
    setFacing('user');

    try {
      const [mic, cam] = await Promise.all([
        navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        }),
        getCamera('user'),
      ]);
      // Cancelled while the permission prompt was up.
      if ((phaseRef.current as Phase) !== 'starting') {
        mic.getTracks().forEach((t) => t.stop());
        cam.getTracks().forEach((t) => t.stop());
        return;
      }
      micStreamRef.current = mic;
      camStreamRef.current = cam;
      setPreviewStream(cam);

      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => setCanFlip(devices.filter((d) => d.kind === 'videoinput').length > 1))
        .catch(() => setCanFlip(false));

      // Off-DOM <video> feeding the compositor.
      const camVideo = document.createElement('video');
      camVideo.muted = true;
      camVideo.playsInline = true;
      camVideo.srcObject = cam;
      await camVideo.play().catch(() => {});
      camVideoRef.current = camVideo;

      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      const canComposite = !!ctx && typeof canvas.captureStream === 'function';

      let recordStream: MediaStream;
      if (canComposite && ctx) {
        canvasRef.current = canvas;
        const draw = () => {
          const v = camVideoRef.current;
          if (v && v.videoWidth > 0) {
            const side = Math.min(v.videoWidth, v.videoHeight);
            const sx = (v.videoWidth - side) / 2;
            const sy = (v.videoHeight - side) / 2;
            ctx.save();
            if (facingRef.current === 'user') {
              ctx.translate(OUTPUT_SIZE, 0);
              ctx.scale(-1, 1);
            }
            ctx.drawImage(v, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
            ctx.restore();
          }
          drawRef.current = requestAnimationFrame(draw);
        };
        draw();
        recordStream = new MediaStream([
          ...canvas.captureStream(30).getVideoTracks(),
          ...mic.getAudioTracks(),
        ]);
      } else {
        recordStream = new MediaStream([...cam.getVideoTracks(), ...mic.getAudioTracks()]);
      }

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(recordStream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 1_400_000,
        audioBitsPerSecond: 64_000,
      });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const seconds = (performance.now() - startedAtRef.current) / 1000;
        const send = sendOnStopRef.current;
        const type = recorder.mimeType || mimeType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        releaseDevices();
        setPhaseBoth('idle');
        setElapsed(0);

        if (!send) return;
        if (seconds < MIN_SEND_SECONDS || blob.size === 0) {
          onErrorRef.current?.('Кружок слишком короткий');
          return;
        }
        const ext = type.includes('mp4') ? 'mp4' : 'webm';
        const reader = new FileReader();
        reader.onload = () => {
          onRecordedRef.current({
            name: `Видео-кружок.${ext}`,
            type: 'video_note',
            data: reader.result as string,
            size: blob.size,
            rawBlob: blob,
            duration: Math.max(1, Math.round(Math.min(seconds, VIDEO_NOTE_MAX_SECONDS))),
          });
        };
        reader.readAsDataURL(blob);
      };

      recorderRef.current = recorder;
      recorder.start(250);
      startedAtRef.current = performance.now();
      setPhaseBoth('recording');

      tickRef.current = window.setInterval(() => {
        const s = (performance.now() - startedAtRef.current) / 1000;
        setElapsed(s);
        if (s >= VIDEO_NOTE_MAX_SECONDS) {
          sendOnStopRef.current = true;
          if (recorder.state !== 'inactive') recorder.stop();
        }
      }, 100);
    } catch (err) {
      console.error('Video note recorder:', err);
      releaseDevices();
      setPhaseBoth('idle');
      const denied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      onErrorRef.current?.(denied ? 'Нет доступа к камере или микрофону' : 'Не удалось запустить камеру');
    }
  }, [releaseDevices]);

  const flip = useCallback(async () => {
    // Without the canvas compositor the recorder is bound to the original camera track.
    if (phaseRef.current !== 'recording' || !canvasRef.current) return;
    const next: Facing = facingRef.current === 'user' ? 'environment' : 'user';
    try {
      const cam = await getCamera(next);
      const old = camStreamRef.current;
      camStreamRef.current = cam;
      facingRef.current = next;
      setFacing(next);
      setPreviewStream(cam);
      if (camVideoRef.current) {
        camVideoRef.current.srcObject = cam;
        await camVideoRef.current.play().catch(() => {});
      }
      old?.getTracks().forEach((t) => t.stop());
    } catch {
      onErrorRef.current?.('Не удалось переключить камеру');
    }
  }, []);

  // Never leave the camera light on if the screen unmounts mid-recording.
  useEffect(() => () => {
    sendOnStopRef.current = false;
    const r = recorderRef.current;
    if (r && r.state !== 'inactive') {
      r.onstop = null;
      r.stop();
    }
    releaseDevices();
  }, [releaseDevices]);

  return {
    phase,
    isActive: phase !== 'idle',
    elapsed,
    facing,
    canFlip,
    previewStream,
    start,
    stop,
    flip,
    maxSeconds: VIDEO_NOTE_MAX_SECONDS,
  };
}

export type VideoNoteRecorder = ReturnType<typeof useVideoNoteRecorder>;
