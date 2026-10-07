/**
 * WebRTC call signalling relay (offer/answer/ICE, accept/reject/end and the
 * screen-share state flag). Targeted relays are only delivered when the target
 * socket belongs to a participant of the same room.
 */
import { checkSocketRateLimit } from '../middleware/rateLimit.js';
import { isRoomAllowedForUser, socketToUser } from '../services/store.js';

const CALL_TYPES = new Set(['audio', 'video']);

export function registerCallHandlers({ io, socket, user, on }) {
  /** Emits to `targetSocketId` (if it is a room member) or to everyone else in the room. */
  const relay = (roomId, targetSocketId, event, payload) => {
    if (typeof targetSocketId === 'string' && targetSocketId) {
      const targetUser = socketToUser.get(targetSocketId);
      if (!targetUser || !isRoomAllowedForUser(roomId, targetUser)) return;
      io.to(targetSocketId).emit(event, payload);
    } else {
      socket.to(roomId).emit(event, payload);
    }
  };

  on('call_user', ({ roomId, type }) => {
    if (!isRoomAllowedForUser(roomId, user)) return;
    if (!checkSocketRateLimit(socket.id, 'call_user', 5, 30000)) return;
    socket.to(roomId).emit('call_incoming', {
      roomId,
      caller: user,
      callerSocketId: socket.id,
      type: CALL_TYPES.has(type) ? type : 'audio',
    });
  });

  on('call_accept', ({ roomId, targetSocketId }) => {
    if (!isRoomAllowedForUser(roomId, user)) return;
    relay(roomId, targetSocketId, 'call_accepted', { roomId, targetSocketId: socket.id });
  });

  on('call_reject', ({ roomId, targetSocketId }) => {
    if (!isRoomAllowedForUser(roomId, user)) return;
    relay(roomId, targetSocketId, 'call_rejected', { roomId });
  });

  on('call_end', ({ roomId, targetSocketId }) => {
    if (!isRoomAllowedForUser(roomId, user)) return;
    relay(roomId, targetSocketId, 'call_ended', { roomId });
  });

  on('webrtc_signal', ({ roomId, targetSocketId, signal }) => {
    if (!isRoomAllowedForUser(roomId, user) || !signal || typeof signal !== 'object') return;
    if (!checkSocketRateLimit(socket.id, 'webrtc_signal', 300, 10000)) return;
    relay(roomId, targetSocketId, 'webrtc_signal', { signal, senderSocketId: socket.id });
  });

  // Screen sharing toggles are signalled separately so the peer can switch layout
  // (the media itself flows through a renegotiated RTCPeerConnection track).
  on('call_screen_share', ({ roomId, targetSocketId, active }) => {
    if (!isRoomAllowedForUser(roomId, user)) return;
    relay(roomId, targetSocketId, 'call_screen_share', { roomId, active: Boolean(active), senderSocketId: socket.id });
  });
}
