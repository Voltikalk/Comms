import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  IconArrowsDiagonal,
  IconArrowsDiagonalMinimize2,
  IconMicrophone,
  IconMicrophoneOff,
  IconPhone,
  IconPhoneOff,
  IconScreenShare,
  IconScreenShareOff,
  IconVideo,
  IconVideoOff,
} from '@tabler/icons-react';
import { useCall } from '../../context/contexts';

const SPRING = { type: 'spring', stiffness: 400, damping: 28 } as const;

/**
 * `<video>` bound to a MediaStream via its own effect, so it survives
 * remounts when the call switches between full-screen and PiP layouts.
 * Always muted: remote audio is played by a single hidden `<audio>`.
 */
const StreamVideo: React.FC<{ stream: MediaStream | null; mirrored?: boolean; contain?: boolean; className?: string }> = ({
  stream,
  mirrored = false,
  contain = false,
  className = '',
}) => {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className={`w-full h-full ${contain ? 'object-contain bg-black' : 'object-cover'} ${mirrored ? 'scale-x-[-1]' : ''} ${className}`}
    />
  );
};

const RemoteAudio: React.FC<{ stream: MediaStream | null }> = ({ stream }) => {
  const ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    if (stream) el.play().catch(() => undefined);
  }, [stream]);
  return <audio ref={ref} autoPlay playsInline className="hidden" />;
};

const CtrlButton: React.FC<{
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}> = ({ onClick, active = false, danger = false, label, size = 'md', children }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    title={label}
    aria-label={label}
    aria-pressed={danger ? undefined : active}
    className={`${size === 'lg' ? 'w-14 h-14' : size === 'sm' ? 'w-9 h-9' : 'w-12 h-12'} rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-colors active:scale-95 ${
      danger ? 'bg-rose-600 hover:bg-rose-500 text-white' : active ? 'bg-white text-slate-900' : 'bg-white/12 text-white hover:bg-white/20 backdrop-blur-md'
    }`}
  >
    {children}
  </button>
);

export interface CallOverlayProps {
  peerName: string;
}

/**
 * WebRTC call UI: full-screen overlay with mute / camera / screen-share
 * controls, collapsible into a draggable floating PiP window so the user can
 * keep chatting during the call.
 */
export const CallOverlay: React.FC<CallOverlayProps> = ({ peerName }) => {
  const {
    callSession,
    acceptCall,
    rejectCall,
    endCall,
    localStream,
    remoteStream,
    isMuted,
    toggleMute,
    isCameraOff,
    toggleCamera,
    isScreenSharing,
    isRemoteScreenSharing,
    toggleScreenShare,
    isCallMinimized,
    setCallMinimized,
  } = useCall();
  const dragBounds = useRef<HTMLDivElement | null>(null);

  if (!callSession) return null;

  const isActive = callSession.status === 'active';
  const showVideo = isActive && (callSession.type === 'video' || isScreenSharing || isRemoteScreenSharing);
  const minimized = isActive && isCallMinimized;
  const canShareScreen = isActive && typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia;
  const statusText =
    callSession.status === 'calling'
      ? 'Исходящий вызов…'
      : callSession.status === 'incoming'
        ? `Входящий ${callSession.type === 'video' ? 'видеовызов' : 'аудиовызов'}…`
        : isRemoteScreenSharing
          ? `${peerName} показывает экран`
          : isScreenSharing
            ? 'Вы показываете экран'
            : callSession.type === 'video'
              ? 'Видеозвонок'
              : 'Аудиозвонок';

  return (
    <>
      {isActive && <RemoteAudio stream={remoteStream} />}

      <AnimatePresence mode="wait">
        {minimized ? (
          <div key="pip-bounds" ref={dragBounds} className="fixed inset-2 z-[90] pointer-events-none">
            <motion.div
              drag
              dragConstraints={dragBounds}
              dragMomentum={false}
              dragElastic={0.12}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={SPRING}
              onDoubleClick={() => setCallMinimized(false)}
              className="absolute right-2 bottom-24 md:bottom-4 pointer-events-auto cursor-grab active:cursor-grabbing rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-[#17212b]/90 backdrop-blur-xl text-white select-none touch-none"
              role="dialog"
              aria-label={`Звонок с ${peerName}`}
            >
              {showVideo ? (
                <div className="relative w-[220px] sm:w-[260px] aspect-video bg-black">
                  <StreamVideo stream={remoteStream} contain={isRemoteScreenSharing} />
                  <div className="absolute top-1.5 left-2 text-[11px] font-semibold drop-shadow">{peerName}</div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 px-3 pt-3 w-[220px]">
                  <span className="relative w-9 h-9 rounded-full bg-[#3390ec] flex items-center justify-center font-bold uppercase shrink-0">
                    {peerName.charAt(0)}
                    <span className="absolute inset-0 rounded-full ring-2 ring-emerald-400/70 animate-ping" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold truncate">{peerName}</div>
                    <div className="text-[11px] text-emerald-400">{statusText}</div>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-center gap-2 p-2">
                <CtrlButton size="sm" onClick={toggleMute} active={isMuted} label={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}>
                  {isMuted ? <IconMicrophoneOff size={16} /> : <IconMicrophone size={16} />}
                </CtrlButton>
                <CtrlButton size="sm" onClick={() => setCallMinimized(false)} label="Развернуть звонок">
                  <IconArrowsDiagonal size={16} />
                </CtrlButton>
                <CtrlButton size="sm" danger onClick={endCall} label="Завершить звонок">
                  <IconPhoneOff size={16} />
                </CtrlButton>
              </div>
            </motion.div>
          </div>
        ) : (
          <motion.div
            key="call-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center text-white select-none pt-[max(1.5rem,calc(env(safe-area-inset-top,0px)+1rem))] pb-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1rem))] px-4"
            role="dialog"
            aria-modal="true"
            aria-label={`Звонок с ${peerName}`}
          >
            {isActive && (
              <button
                type="button"
                onClick={() => setCallMinimized(true)}
                className="absolute top-[max(1rem,env(safe-area-inset-top,0px))] left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer transition-colors"
                title="Свернуть (картинка в картинке)"
                aria-label="Свернуть звонок"
              >
                <IconArrowsDiagonalMinimize2 size={20} />
              </button>
            )}

            <motion.div
              initial={{ scale: 0.94, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              transition={SPRING}
              className={`w-full ${showVideo ? 'max-w-3xl' : 'max-w-sm'} p-4 flex flex-col items-center gap-5`}
            >
              <div className="flex flex-col items-center gap-2">
                {!showVideo && (
                  <div className="w-24 h-24 rounded-full bg-[#3390ec] flex items-center justify-center text-4xl font-bold uppercase shadow-lg">
                    {peerName.charAt(0) || '?'}
                  </div>
                )}
                <h2 className="text-xl font-bold mt-1">{peerName}</h2>
                <span className="text-xs uppercase tracking-wider text-slate-300">{statusText}</span>
              </div>

              {showVideo && (
                <div className="w-full aspect-video rounded-2xl overflow-hidden relative bg-black shadow-xl border border-white/10">
                  <StreamVideo stream={remoteStream} contain={isRemoteScreenSharing} />
                  {localStream && (!isCameraOff || isScreenSharing) && (
                    <motion.div
                      layout
                      transition={SPRING}
                      className="absolute bottom-3 right-3 w-1/4 min-w-[96px] aspect-video rounded-xl overflow-hidden bg-black shadow-md border border-white/20"
                    >
                      <StreamVideo stream={localStream} mirrored={!isScreenSharing} contain={isScreenSharing} />
                    </motion.div>
                  )}
                  {isScreenSharing && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-emerald-500/90 text-[11px] font-semibold flex items-center gap-1">
                      <IconScreenShare size={13} /> Демонстрация экрана
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 mt-2">
                {callSession.status === 'incoming' ? (
                  <>
                    <CtrlButton size="lg" danger onClick={rejectCall} label="Отклонить">
                      <IconPhoneOff size={22} />
                    </CtrlButton>
                    <button
                      type="button"
                      onClick={() => void acceptCall()}
                      title="Принять"
                      aria-label="Принять"
                      className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg cursor-pointer animate-pulse"
                    >
                      <IconPhone size={22} />
                    </button>
                  </>
                ) : (
                  <>
                    {isActive && (
                      <CtrlButton onClick={toggleMute} active={isMuted} label={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}>
                        {isMuted ? <IconMicrophoneOff size={20} /> : <IconMicrophone size={20} />}
                      </CtrlButton>
                    )}
                    {isActive && callSession.type === 'video' && (
                      <CtrlButton onClick={toggleCamera} active={isCameraOff} label={isCameraOff ? 'Включить камеру' : 'Выключить камеру'}>
                        {isCameraOff ? <IconVideoOff size={20} /> : <IconVideo size={20} />}
                      </CtrlButton>
                    )}
                    {canShareScreen && (
                      <CtrlButton
                        onClick={() => void toggleScreenShare()}
                        active={isScreenSharing}
                        label={isScreenSharing ? 'Остановить демонстрацию' : 'Демонстрация экрана'}
                      >
                        {isScreenSharing ? <IconScreenShareOff size={20} /> : <IconScreenShare size={20} />}
                      </CtrlButton>
                    )}
                    <CtrlButton size="lg" danger onClick={endCall} label="Завершить звонок">
                      <IconPhoneOff size={22} />
                    </CtrlButton>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CallOverlay;
