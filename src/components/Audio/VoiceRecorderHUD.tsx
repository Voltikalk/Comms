import React from 'react';
import {
  IconLock,
  IconPlayerPause,
  IconPlayerPlay,
  IconTrash,
  IconChevronLeft,
  IconSquare,
  IconSend
} from '@tabler/icons-react';

export interface VoiceRecorderHUDProps {
  isRecording: boolean;
  isLocked: boolean;
  isPaused: boolean;
  recordTime: number;
  liveVolumeLevels: number[];
  dragOffset: { x: number; y: number };
  onCancel: () => void;
  onTogglePause: () => void;
  onStopAndPreview: () => void;
  onSend: () => void;
}

export const VoiceRecorderHUD: React.FC<VoiceRecorderHUDProps> = ({
  isRecording,
  isLocked,
  isPaused,
  recordTime,
  liveVolumeLevels,
  dragOffset,
  onCancel,
  onTogglePause,
  onStopAndPreview,
  onSend,
}) => {
  if (!isRecording) return null;

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Slide-to-cancel drag calculations
  const slideX = Math.min(0, dragOffset.x);
  const isNearCancel = slideX < -70;

  return (
    <>
      {/* 1. Floating Lock Indicator (Swipe Up to Lock) */}
      {!isLocked && (
        <div
          className="absolute -top-16 right-1 z-30 flex flex-col items-center gap-1 transition-all duration-150 pointer-events-none"
          style={{
            transform: `translateY(${Math.max(-25, Math.min(0, dragOffset.y * 0.4))}px)`,
            opacity: Math.max(0.4, 1 + dragOffset.y / 80),
          }}
        >
          <div className="w-9 h-12 rounded-full bg-white/95 dark:bg-[#17212b]/95 backdrop-blur-md shadow-xl border border-slate-200/80 dark:border-white/10 flex flex-col items-center justify-center text-slate-500 dark:text-slate-300 animate-bounce">
            <IconLock size={16} stroke={2.5} className="text-[#3390ec]" />
            <span className="text-[8px] font-bold mt-0.5 text-slate-400">▲</span>
          </div>
        </div>
      )}

      {/* 2. Main Recording Track (Replaces input field) */}
      <div className="flex-1 flex items-center justify-between py-1 px-3 select-none min-w-0 bg-white/95 dark:bg-[#17212b]/95 rounded-2xl shadow-xs border border-slate-200/80 dark:border-white/10">
        
        {/* Left: Red recording dot & Timer */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isPaused ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'
            }`}
          />
          <span className="font-mono text-xs font-bold text-slate-800 dark:text-white">
            {formatTime(recordTime)}
          </span>
          {isPaused && (
            <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider hidden sm:inline">
              Пауза
            </span>
          )}
        </div>

        {/* Center: Live Audio Waveform or Slide-to-Cancel Guide */}
        {!isLocked ? (
          <div
            className="flex items-center gap-1.5 text-slate-400 dark:text-slate-400 text-xs font-medium transition-transform duration-75 min-w-0 overflow-hidden"
            style={{ transform: `translateX(${slideX * 0.4}px)` }}
          >
            <IconChevronLeft size={16} className="animate-pulse shrink-0 text-[#3390ec]" />
            <span className="truncate text-[11px] sm:text-xs">
              {isNearCancel ? 'Отпустите для отмены' : 'Проведите влево для отмены'}
            </span>
          </div>
        ) : (
          /* Live Waveform when in Hands-Free Mode */
          <div className="flex items-center gap-[3px] h-6 px-2 overflow-hidden max-w-[120px] sm:max-w-[220px]">
            {(liveVolumeLevels.length > 0
              ? liveVolumeLevels
              : [15, 30, 45, 60, 40, 20, 50, 75, 40, 20, 35, 55, 25, 45]
            ).map((vol, idx) => (
              <span
                key={idx}
                className={`w-[2.5px] rounded-full transition-all duration-75 ease-out ${
                  isPaused ? 'bg-slate-400 opacity-50' : 'bg-[#3390ec]'
                }`}
                style={{
                  height: `${Math.max(4, Math.min(22, (vol / 100) * 22))}px`,
                }}
              />
            ))}
          </div>
        )}

        {/* Right: Actions */}
        {!isLocked ? (
          <div
            className={`flex items-center gap-1 transition-all ${
              isNearCancel ? 'text-rose-500 scale-110' : 'text-slate-400'
            }`}
          >
            <IconTrash size={18} />
          </div>
        ) : (
          /* Locked Mode Controls: Pause/Resume, Stop/Preview, Trash, Send */
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Discard Trash */}
            <button
              type="button"
              onClick={onCancel}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all cursor-pointer"
              title="Удалить запись"
            >
              <IconTrash size={17} />
            </button>

            {/* Pause / Resume Button */}
            <button
              type="button"
              onClick={onTogglePause}
              className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer ${
                isPaused
                  ? 'bg-amber-500/15 text-amber-500 hover:bg-amber-500/25'
                  : 'bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:text-[#3390ec]'
              }`}
              title={isPaused ? 'Продолжить запись' : 'Поставить на паузу'}
            >
              {isPaused ? <IconPlayerPlay size={16} fill="currentColor" /> : <IconPlayerPause size={16} />}
            </button>

            {/* Stop and Preview Button */}
            <button
              type="button"
              onClick={onStopAndPreview}
              className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 hover:bg-[#3390ec]/15 text-slate-700 dark:text-slate-200 hover:text-[#3390ec] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
              title="Прослушать перед отправкой"
            >
              <IconSquare size={14} fill="currentColor" />
            </button>

            {/* Direct Send Button */}
            <button
              type="button"
              onClick={onSend}
              className="w-8 h-8 rounded-full bg-[#3390ec] text-white hover:bg-[#2879c9] flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xs"
              title="Отправить"
            >
              <IconSend size={15} />
            </button>
          </div>
        )}
      </div>
    </>
  );
};
