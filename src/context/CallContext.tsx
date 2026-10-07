import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CallSession, UserId } from '../types';
import { CallContext, useAuth, useConnection, useRooms, type CallContextValue } from './contexts';

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
const INSECURE_MEDIA_ERROR =
  'Камера/микрофон заблокированы. WebRTC звонки требуют HTTPS или localhost. ' +
  'В Chrome откройте chrome://flags/#unsafely-treat-insecure-origin-as-secure ' +
  'и добавьте адрес вашего сайта в список разрешенных.';

const hasUserMedia = () => typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

/**
 * 1:1 WebRTC calls signalled over Socket.io (`call_*`, `webrtc_signal`).
 * Screen sharing swaps the outgoing video track via `RTCRtpSender.replaceTrack`
 * (or adds one and renegotiates for audio-only calls).
 */
export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { socket, setError } = useConnection();
  const { activeRoom } = useRooms();

  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState(false);
  const [isCallMinimized, setCallMinimized] = useState(false);

  const socketRef = useRef(socket);
  const currentUserRef = useRef(currentUser);
  const sessionRef = useRef<CallSession | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const pcRoomIdRef = useRef('');
  const targetSocketIdRef = useRef('');
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  useEffect(() => {
    socketRef.current = socket;
    currentUserRef.current = currentUser;
    sessionRef.current = callSession;
  });

  const emitSignal = useCallback((event: string, data: Record<string, unknown>) => {
    socketRef.current?.emit(event, { ...data, targetSocketId: targetSocketIdRef.current || undefined });
  }, []);

  const cleanupCall = useCallback(() => {
    screenTrackRef.current?.stop();
    screenTrackRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    pcRoomIdRef.current = '';
    targetSocketIdRef.current = '';
    pendingCandidatesRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setCallSession(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
    setIsRemoteScreenSharing(false);
    setCallMinimized(false);
  }, []);

  // Hang up when the account signs out.
  useEffect(() => {
    if (!currentUser) cleanupCall();
  }, [currentUser, cleanupCall]);

  const renegotiate = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    emitSignal('webrtc_signal', { roomId: pcRoomIdRef.current, signal: { sdp: offer } });
  }, [emitSignal]);

  const initPeerConnection = useCallback(
    (stream: MediaStream, roomId: string) => {
      pcRoomIdRef.current = roomId;
      pendingCandidatesRef.current = [];
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      pc.onicecandidate = (event) => {
        if (event.candidate) emitSignal('webrtc_signal', { roomId, signal: { candidate: event.candidate } });
      };
      pc.ontrack = (event) => {
        if (event.streams?.[0]) {
          setRemoteStream(event.streams[0]);
          return;
        }
        setRemoteStream((prev) => {
          const s = prev || new MediaStream();
          s.addTrack(event.track);
          return s;
        });
      };
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      return pc;
    },
    [emitSignal],
  );

  const getMedia = useCallback(
    async (type: 'audio' | 'video') => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    },
    [],
  );

  const startCall = useCallback(
    async (type: 'audio' | 'video') => {
      const room = activeRoom;
      if (!socketRef.current || !currentUser || !room || room.type !== 'direct') return;
      const receiver = room.participants.find((p) => p !== currentUser);
      if (!receiver) return;
      if (!hasUserMedia()) {
        setError(INSECURE_MEDIA_ERROR);
        return;
      }
      try {
        const stream = await getMedia(type);
        setCallSession({ roomId: room.id, caller: currentUser, receiver, type, status: 'calling' });
        initPeerConnection(stream, room.id);
        socketRef.current.emit('call_user', { roomId: room.id, receiver, type });
      } catch (err) {
        console.error('[WebRTC] startCall error:', err);
        cleanupCall();
        setError('Не удалось получить доступ к микрофону/камере.');
      }
    },
    [activeRoom, currentUser, getMedia, initPeerConnection, cleanupCall, setError],
  );

  const rejectCall = useCallback(() => {
    const session = sessionRef.current;
    if (session) emitSignal('call_reject', { roomId: session.roomId });
    cleanupCall();
  }, [emitSignal, cleanupCall]);

  const endCall = useCallback(() => {
    const session = sessionRef.current;
    if (session) emitSignal('call_end', { roomId: session.roomId });
    cleanupCall();
  }, [emitSignal, cleanupCall]);

  const acceptCall = useCallback(async () => {
    const session = sessionRef.current;
    if (!socketRef.current || !session) return;
    if (!hasUserMedia()) {
      setError(INSECURE_MEDIA_ERROR);
      rejectCall();
      return;
    }
    try {
      const stream = await getMedia(session.type);
      initPeerConnection(stream, session.roomId);
      setCallSession((prev) => (prev ? { ...prev, status: 'active' } : null));
      emitSignal('call_accept', { roomId: session.roomId });
    } catch (err) {
      console.error('[WebRTC] acceptCall error:', err);
      setError('Не удалось получить доступ к микрофону/камере.');
      rejectCall();
    }
  }, [getMedia, initPeerConnection, emitSignal, rejectCall, setError]);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
  }, []);

  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsCameraOff(!track.enabled);
  }, []);

  // ===== Screen sharing =====
  const stopScreenShare = useCallback(async () => {
    const pc = pcRef.current;
    const screen = screenTrackRef.current;
    screenTrackRef.current = null;
    screen?.stop();
    setIsScreenSharing(false);
    if (!pc) return;
    const sender = pc.getSenders().find((s) => s.track === screen);
    const camera = localStreamRef.current?.getVideoTracks()[0] ?? null;
    if (sender) await sender.replaceTrack(camera).catch(() => undefined);
    const stream = localStreamRef.current;
    setLocalStream(stream ? new MediaStream(stream.getTracks()) : null);
    emitSignal('call_screen_share', { roomId: pcRoomIdRef.current, active: false });
  }, [emitSignal]);

  const toggleScreenShare = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || sessionRef.current?.status !== 'active') return;
    if (screenTrackRef.current) {
      await stopScreenShare();
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('Демонстрация экрана не поддерживается этим браузером.');
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const track = display.getVideoTracks()[0];
      if (!track) return;
      screenTrackRef.current = track;
      // The browser's own «Прекратить показ» button ends the track.
      track.onended = () => {
        if (screenTrackRef.current === track) void stopScreenShare();
      };
      const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(track);
      } else {
        pc.addTrack(track, display);
        await renegotiate();
      }
      const audio = localStreamRef.current?.getAudioTracks() ?? [];
      setLocalStream(new MediaStream([...audio, track]));
      setIsScreenSharing(true);
      emitSignal('call_screen_share', { roomId: pcRoomIdRef.current, active: true });
    } catch (err) {
      // NotAllowedError = the user closed the picker; not worth an error banner.
      if (!(err instanceof DOMException && err.name === 'NotAllowedError')) {
        console.error('[WebRTC] screen share error:', err);
        setError('Не удалось начать демонстрацию экрана.');
      }
    }
  }, [stopScreenShare, renegotiate, emitSignal, setError]);

  // ===== Signalling =====
  useEffect(() => {
    if (!socket) return;

    const onIncoming = (data: { roomId: string; caller: UserId; callerSocketId?: string; type: 'audio' | 'video' }) => {
      const me = currentUserRef.current;
      if (!me) return;
      if (sessionRef.current) {
        // Busy: decline the second call without touching the current one.
        socket.emit('call_reject', { roomId: data.roomId, targetSocketId: data.callerSocketId });
        return;
      }
      if (data.callerSocketId) targetSocketIdRef.current = data.callerSocketId;
      setCallSession({ roomId: data.roomId, caller: data.caller, receiver: me, type: data.type, status: 'incoming' });
    };

    const onAccepted = async (data?: { roomId?: string; targetSocketId?: string }) => {
      if (data?.targetSocketId) targetSocketIdRef.current = data.targetSocketId;
      if (!pcRef.current) return;
      try {
        await renegotiate();
        setCallSession((prev) => (prev ? { ...prev, status: 'active' } : null));
      } catch (err) {
        console.error('[WebRTC] Failed to create offer:', err);
      }
    };

    const onEnded = () => cleanupCall();

    const onSignal = async ({ signal, senderSocketId }: { signal: { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }; senderSocketId?: string }) => {
      if (senderSocketId) targetSocketIdRef.current = senderSocketId;
      const pc = pcRef.current;
      try {
        if (signal.sdp) {
          if (!pc) return;
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          for (const candidate of pendingCandidatesRef.current.splice(0)) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => undefined);
          }
          if (signal.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            emitSignal('webrtc_signal', { roomId: pcRoomIdRef.current, signal: { sdp: answer } });
            setCallSession((prev) => (prev ? { ...prev, status: 'active' } : null));
          }
        } else if (signal.candidate) {
          if (pc?.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => undefined);
          else pendingCandidatesRef.current.push(signal.candidate);
        }
      } catch (err) {
        console.error('[WebRTC] Error handling signal:', err);
      }
    };

    const onScreenShare = (data: { active: boolean }) => setIsRemoteScreenSharing(Boolean(data?.active));

    socket.on('call_incoming', onIncoming);
    socket.on('call_accepted', onAccepted);
    socket.on('call_rejected', onEnded);
    socket.on('call_ended', onEnded);
    socket.on('webrtc_signal', onSignal);
    socket.on('call_screen_share', onScreenShare);
    return () => {
      socket.off('call_incoming', onIncoming);
      socket.off('call_accepted', onAccepted);
      socket.off('call_rejected', onEnded);
      socket.off('call_ended', onEnded);
      socket.off('webrtc_signal', onSignal);
      socket.off('call_screen_share', onScreenShare);
    };
  }, [socket, cleanupCall, renegotiate, emitSignal]);

  const value = useMemo<CallContextValue>(
    () => ({
      callSession,
      startCall,
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
    }),
    [
      callSession,
      startCall,
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
    ],
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};
