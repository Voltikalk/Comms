import React, { useState, useRef, useEffect } from 'react';
import {
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
  IconTrash,
  IconSend
} from '@tabler/icons-react';

export interface VoicePreviewPlayerProps {
  audioUrl: string;
  duration: number;
  waveform: number[];
  onCancel: () => void;
  onSend: () => void;
}

export const VoicePreviewPlayer: React.FC<VoicePreviewPlayerProps> = ({
  audioUrl,
  duration,
  waveform,
  onCancel,
  onSend,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audioRef.current = null;
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((err) => console.warn('Preview play error:', err));
    }
  };

  const handleSeek = (index: number) => {
    if (!audioRef.current || duration <= 0) return;
    const progressFraction = (index + 0.5) / (waveform.length || 30);
    const newTime = progressFraction * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bars = waveform && waveform.length > 0 ? waveform : Array.from({ length: 30 }, () => 20);

  return (
    <div className="flex-1 flex items-center justify-between py-1 px-2 select-none min-w-0 bg-white/95 dark:bg-[#17212b]/95 rounded-2xl shadow-xs border border-slate-200/80 dark:border-white/10 animate-pop-in">
      
      {/* Play / Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-[#3390ec] text-white flex items-center justify-center shrink-0 active:scale-95 transition-transform cursor-pointer shadow-xs"
        title={isPlaying ? 'Пауза' : 'Слушать'}
      >
        {isPlaying ? <IconPlayerPauseFilled size={15} /> : <IconPlayerPlayFilled size={15} />}
      </button>

      {/* Interactive Waveform Track */}
      <div className="flex-1 flex flex-col justify-center px-3 min-w-0">
        <div className="flex items-center gap-[2.5px] h-6 cursor-pointer py-1" title="Перемотка">
          {bars.map((vol, idx) => {
            const barProgress = ((idx + 0.5) / bars.length) * 100;
            const isPlayed = barProgress <= progressPct;

            return (
              <span
                key={idx}
                onClick={() => handleSeek(idx)}
                className={`flex-1 min-w-[2px] max-w-[4px] rounded-full transition-colors cursor-pointer hover:opacity-100 ${
                  isPlayed
                    ? 'bg-[#3390ec]'
                    : 'bg-slate-300 dark:bg-white/20'
                }`}
                style={{
                  height: `${Math.max(4, Math.min(22, (vol / 100) * 22))}px`,
                }}
              />
            );
          })}
        </div>

        {/* Time Progress */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono leading-none">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Actions: Trash and Send */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all cursor-pointer"
          title="Удалить запись"
        >
          <IconTrash size={17} />
        </button>

        <button
          type="button"
          onClick={onSend}
          className="w-8 h-8 rounded-full bg-[#3390ec] text-white hover:bg-[#2879c9] flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xs"
          title="Отправить голосовое"
        >
          <IconSend size={15} />
        </button>
      </div>
    </div>
  );
};
