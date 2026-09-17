import { useState, useRef, useEffect } from 'react';

export interface UseVideoNoteRecordingOptions {
  sendMessage: (text: string, replyToId?: string, file?: any) => void;
}

export const useVideoNoteRecording = ({
  sendMessage,
}: UseVideoNoteRecordingOptions) => {
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoRecordTime, setVideoRecordTime] = useState(0);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoIntervalRef = useRef<any>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Video Circle Note recording (up to 60 seconds)
  const startVideoRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Запись видео-кружков требует защищенного соединения (HTTPS или localhost).');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: {
          facingMode: 'user',
          width: { ideal: 480, max: 720 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 30, max: 30 },
        },
      });

      setVideoStream(stream);
      setIsRecordingVideo(true);
      setVideoRecordTime(0);
      videoChunksRef.current = [];

      setTimeout(() => {
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
      }, 100);

      let mimeType = 'video/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
          mimeType = 'video/webm;codecs=vp8,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          mimeType = 'video/webm';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
        }
      }

      const recorderOptions: MediaRecorderOptions = {
        mimeType: mimeType || undefined,
        videoBitsPerSecond: 1_200_000,
      };

      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      videoRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const actualMimeType = mediaRecorder.mimeType || mimeType || 'video/webm';
        const videoBlob = new Blob(videoChunksRef.current, { type: actualMimeType });
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          const extension = actualMimeType.includes('mp4')
            ? 'mp4'
            : actualMimeType.includes('ogg')
            ? 'ogg'
            : 'webm';
          sendMessage('', undefined, {
            name: `Видео-кружок.${extension}`,
            type: 'video_note',
            data: base64,
            size: videoBlob.size,
            rawBlob: videoBlob,
            duration: videoRecordTime || 1,
          });
        };
        reader.readAsDataURL(videoBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();

      videoIntervalRef.current = setInterval(() => {
        setVideoRecordTime((t) => {
          if (t >= 59) {
            stopVideoRecording(true);
            return 60;
          }
          return t + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Record video circle error:', err);
      alert('Не удалось получить доступ к камере/микрофону.');
    }
  };

  const stopVideoRecording = (shouldSend = true) => {
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }

    if (videoRecorderRef.current && isRecordingVideo) {
      if (!shouldSend) {
        videoRecorderRef.current.onstop = () => {
          videoRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
        };
      }
      videoRecorderRef.current.stop();
    } else if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
    }

    setIsRecordingVideo(false);
    setVideoStream(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
      if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
        videoRecorderRef.current.stop();
      }
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [videoStream]);

  return {
    isRecordingVideo,
    videoRecordTime,
    videoStream,
    videoPreviewRef,
    startVideoRecording,
    stopVideoRecording,
  };
};
