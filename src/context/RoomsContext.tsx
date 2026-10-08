import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ConnectionStatus, Room, RoomPreview, UserId, UserProfile, UserSearchResult } from '../types';
import { ALL_ROOMS, DEFAULT_USER_PROFILES, USER_NAMES } from '../constants';
import authService from '../services/auth.service';
import {
  RoomsContext,
  useAuth,
  useConnection,
  type CreateChannelInput,
  type JoinTarget,
  type RoomActionResult,
  type RoomEvent,
  type RoomsContextValue,
} from './contexts';

const SAVED_MESSAGES_ID = 'saved-messages';
const ACTIVE_ROOM_KEY = 'chat_active_room_v2';
const PROFILES_KEY = 'chat_user_profiles_v2';
const PRESET_USERS = ['vlad', 'anya', 'mom', 'dad', 'sister'];
const roomsKey = (user: string) => `chat_server_rooms_${user}`;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota / privacy mode
  }
}

function initialRoomId(): string {
  const hash = window.location.hash.match(/^#\/chat\/(.+)$/);
  if (hash) return decodeURIComponent(hash[1]);
  try {
    return localStorage.getItem(ACTIVE_ROOM_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Chats, navigation (`#/chat/{id}` deep links), presence, typing and user profiles.
 */
export const RoomsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, user } = useAuth();
  const { socket, isConnected, emitWithAck } = useConnection();

  const [activeRoomId, setActiveRoomIdState] = useState<string>(initialRoomId);
  const [onlineStatus, setOnlineStatus] = useState<ConnectionStatus>(() => ({}) as ConnectionStatus);
  const [typingUsers, setTypingUsers] = useState<Record<string, Record<string, boolean>>>({});
  const [serverRooms, setServerRooms] = useState<{ owner: string | null; rooms: Room[] }>({ owner: null, rooms: [] });
  const [userProfiles, setUserProfiles] = useState<Record<UserId, UserProfile>>(() => ({
    ...DEFAULT_USER_PROFILES,
    ...readJson<Record<UserId, UserProfile>>(PROFILES_KEY, {} as Record<UserId, UserProfile>),
  }));

  // Cached room list per account (restored before the socket delivers `rooms_list`).
  useEffect(() => {
    if (!currentUser) return;
    setServerRooms({ owner: currentUser, rooms: readJson<Room[]>(roomsKey(currentUser), []) });
  }, [currentUser]);

  const storeRooms = useCallback(
    (update: (prev: Room[]) => Room[]) => {
      if (!currentUser) return;
      setServerRooms((prev) => {
        const base = prev.owner === currentUser ? prev.rooms : [];
        const next = update(base);
        if (next === base) return prev;
        writeJson(roomsKey(currentUser), next);
        return { owner: currentUser, rooms: next };
      });
    },
    [currentUser],
  );

  const addRoom = useCallback(
    (room: Room) => storeRooms((prev) => (prev.some((r) => r.id === room.id) ? prev : [room, ...prev])),
    [storeRooms],
  );

  /** Replaces a room with the server's fresher copy (or adds it). */
  const upsertRoom = useCallback(
    (room: Room) =>
      storeRooms((prev) => (prev.some((r) => r.id === room.id) ? prev.map((r) => (r.id === room.id ? room : r)) : [room, ...prev])),
    [storeRooms],
  );

  const removeRoom = useCallback((roomId: string) => storeRooms((prev) => prev.filter((r) => r.id !== roomId)), [storeRooms]);

  // Mirror the authenticated account until the socket delivers the server copy.
  useEffect(() => {
    if (!user) return;
    const uid = user.userId as UserId;
    setUserProfiles((prev) => ({
      ...prev,
      [uid]: {
        ...prev[uid],
        userId: uid,
        firstName: prev[uid]?.firstName || user.firstName || user.username,
        lastName: prev[uid]?.lastName ?? user.lastName ?? '',
        bio: prev[uid]?.bio ?? user.bio ?? '',
        username: user.username,
        phoneNumber: prev[uid]?.phoneNumber ?? user.phoneNumber ?? '',
        avatarUrl: prev[uid]?.avatarUrl || user.avatarUrl || '',
        statusEmoji: prev[uid]?.statusEmoji || user.statusEmoji || '',
      },
    }));
  }, [user]);

  const rooms = useMemo<Room[]>(() => {
    if (!currentUser) return ALL_ROOMS;
    const savedRoom: Room = { id: SAVED_MESSAGES_ID, name: 'Избранное', type: 'direct', participants: [currentUser] };
    // Ignore a cache that belongs to the previous account on this browser.
    const ownedRooms = serverRooms.owner === currentUser ? serverRooms.rooms : [];
    if (ownedRooms.length > 0) return [savedRoom, ...ownedRooms.filter((r) => r.id !== SAVED_MESSAGES_ID)];
    if (PRESET_USERS.includes(currentUser)) {
      return [savedRoom, ...ALL_ROOMS.filter((r) => r.participants.includes(currentUser) || r.id === 'family')];
    }
    return [savedRoom];
  }, [currentUser, serverRooms]);

  // Preset accounts open their first family chat, everyone else «Избранное».
  const fallbackRoom = rooms.find((r) => r.id !== SAVED_MESSAGES_ID && currentUser && PRESET_USERS.includes(currentUser)) ?? rooms[0] ?? null;
  const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? fallbackRoom;

  useEffect(() => {
    if (activeRoom && activeRoom.id !== activeRoomId) {
      setActiveRoomIdState(activeRoom.id);
      try {
        localStorage.setItem(ACTIVE_ROOM_KEY, activeRoom.id);
      } catch {
        // ignore
      }
    }
  }, [activeRoom, activeRoomId]);

  // Reset per-account UI state on sign-out.
  useEffect(() => {
    if (currentUser) return;
    setTypingUsers({});
    setOnlineStatus({} as ConnectionStatus);
    setActiveRoomIdState('');
  }, [currentUser]);

  const activeRoomIdRef = useRef(activeRoomId);
  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  /** Server profiles win over the local cache; the phone is only sent to contacts. */
  const mergeServerProfiles = useCallback((list: UserProfile[]) => {
    setUserProfiles((prev) => {
      const next = { ...prev };
      for (const p of list) {
        if (!p?.userId) continue;
        const uid = p.userId as UserId;
        next[uid] = { ...prev[uid], ...p, phoneNumber: p.phoneNumber ?? prev[uid]?.phoneNumber };
      }
      writeJson(PROFILES_KEY, next);
      return next;
    });
  }, []);

  // ===== Socket events =====
  useEffect(() => {
    if (!socket) return;
    const onRoomsList = (list: Room[]) => {
      if (Array.isArray(list)) storeRooms(() => list);
    };
    const onRoomCreated = (room: Room) => {
      // Re-joining a group delivers it again with the current state.
      upsertRoom(room);
    };
    const onRoomUpdated = (room: Room) => {
      if (room?.id) upsertRoom(room);
    };
    const onRoomRemoved = (data: { roomId: string }) => {
      if (data?.roomId) removeRoom(data.roomId);
    };
    const onStatus = (status: ConnectionStatus) => {
      setOnlineStatus(status);
      // Drop typing indicators of users who went offline.
      setTypingUsers((prev) => {
        let modified = false;
        const next: typeof prev = {};
        for (const [roomId, typing] of Object.entries(prev)) {
          const kept = Object.fromEntries(Object.entries(typing).filter(([name]) => status[name as UserId]));
          if (Object.keys(kept).length !== Object.keys(typing).length) modified = true;
          next[roomId] = kept;
        }
        return modified ? next : prev;
      });
    };
    const onTyping = (data: { roomId: string; username: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const roomTyping = { ...(prev[data.roomId] ?? {}) };
        if (data.isTyping) roomTyping[data.username] = true;
        else delete roomTyping[data.username];
        return { ...prev, [data.roomId]: roomTyping };
      });
    };
    const onProfilesState = (state: Record<string, UserProfile>) => {
      if (state && typeof state === 'object') mergeServerProfiles(Object.values(state));
    };
    const onProfileUpdated = (profile: UserProfile) => {
      if (profile?.userId) mergeServerProfiles([profile]);
    };
    socket.on('rooms_list', onRoomsList);
    socket.on('room_created', onRoomCreated);
    socket.on('room_updated', onRoomUpdated);
    socket.on('room_removed', onRoomRemoved);
    socket.on('status_update', onStatus);
    socket.on('typing_update', onTyping);
    socket.on('profiles_state', onProfilesState);
    socket.on('profile_updated', onProfileUpdated);
    return () => {
      socket.off('rooms_list', onRoomsList);
      socket.off('room_created', onRoomCreated);
      socket.off('room_updated', onRoomUpdated);
      socket.off('room_removed', onRoomRemoved);
      socket.off('status_update', onStatus);
      socket.off('typing_update', onTyping);
      socket.off('profiles_state', onProfilesState);
      socket.off('profile_updated', onProfileUpdated);
    };
  }, [socket, storeRooms, upsertRoom, removeRoom, mergeServerProfiles]);

  // Members of chats joined later (new groups, new DMs) are not in the initial snapshot.
  const requestedProfiles = useRef(new Set<string>());
  useEffect(() => {
    if (!socket) requestedProfiles.current.clear();
  }, [socket]);
  useEffect(() => {
    if (!isConnected) return;
    const missing = [...new Set(rooms.flatMap((r) => r.participants))].filter((id) => id && !requestedProfiles.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => requestedProfiles.current.add(id));
    void emitWithAck<{ profiles?: Record<string, UserProfile> }>('get_profiles', { userIds: missing }, 5000).then((res) => {
      if (res?.profiles) mergeServerProfiles(Object.values(res.profiles));
    });
  }, [rooms, isConnected, emitWithAck, mergeServerProfiles]);

  // ===== Navigation =====
  const setActiveRoomId = useCallback(
    (id: string) => {
      const prev = activeRoomIdRef.current;
      if (socket && isConnected && prev && prev !== id) socket.emit('typing', { roomId: prev, isTyping: false });
      setActiveRoomIdState(id);
      try {
        localStorage.setItem(ACTIVE_ROOM_KEY, id);
        // pushState keeps browser Back working between chats
        const hash = `#/chat/${encodeURIComponent(id)}`;
        if (window.location.hash !== hash) window.history.pushState({ chatRoom: id }, '', hash);
      } catch {
        // ignore
      }
    },
    [socket, isConnected],
  );

  // Browser Back/Forward + manual hash edits → switch chat
  useEffect(() => {
    const onPopState = () => {
      const match = window.location.hash.match(/^#\/chat\/(.+)$/);
      if (!match) return;
      const target = decodeURIComponent(match[1]);
      setActiveRoomIdState(target);
      try {
        localStorage.setItem(ACTIVE_ROOM_KEY, target);
      } catch {
        // ignore
      }
    };
    window.addEventListener('popstate', onPopState);
    window.addEventListener('hashchange', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('hashchange', onPopState);
    };
  }, []);

  const sendTypingStatus = useCallback(
    (isTyping: boolean) => {
      if (socket && isConnected && currentUser && activeRoomId) socket.emit('typing', { roomId: activeRoomId, isTyping });
    },
    [socket, isConnected, currentUser, activeRoomId],
  );

  // ===== Profiles =====
  /** Saves on the server; contacts receive the change via `profile_updated`. */
  const updateUserProfile = useCallback(
    async (updates: Partial<UserProfile>): Promise<{ ok: boolean; error?: string }> => {
      if (!currentUser) return { ok: false, error: 'Вы не вошли в аккаунт.' };
      const res = await emitWithAck<{ ok: boolean; error?: string; profile?: UserProfile }>('update_profile', updates, 8000);
      if (!res) return { ok: false, error: 'Нет соединения с сервером.' };
      if (!res.ok || !res.profile) return { ok: false, error: res.error || 'Не удалось сохранить профиль.' };
      mergeServerProfiles([res.profile]);
      return { ok: true };
    },
    [currentUser, emitWithAck, mergeServerProfiles],
  );

  const getUserDisplayName = useCallback(
    (userId: UserId) => {
      const profile = userProfiles[userId] || DEFAULT_USER_PROFILES[userId];
      const full = profile ? [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() : '';
      return full || USER_NAMES[userId] || userId;
    },
    [userProfiles],
  );

  const getUserAvatar = useCallback((userId: UserId) => userProfiles[userId]?.avatarUrl, [userProfiles]);

  // ===== Directory & chat creation =====
  const searchUsers = useCallback(
    async (query: string): Promise<UserSearchResult[]> => {
      const q = (query || '').trim();
      if (!q) return [];
      const viaSocket = await emitWithAck<{ users?: UserSearchResult[] }>('search_users', { query: q }, 3500);
      if (viaSocket) return viaSocket.users || [];
      try {
        const res = await authService.authFetch(`/api/users/search?q=${encodeURIComponent(q)}`);
        if (res.ok) return ((await res.json()) as { users?: UserSearchResult[] }).users || [];
      } catch {
        // offline
      }
      return [];
    },
    [emitWithAck],
  );

  const openRoom = useCallback(
    async (event: string, payload: unknown): Promise<Room | null> => {
      const res = await emitWithAck<{ room?: Room }>(event, payload, 5000);
      if (!res?.room) return null;
      addRoom(res.room);
      setActiveRoomId(res.room.id);
      return res.room;
    },
    [emitWithAck, addRoom, setActiveRoomId],
  );

  const createDirectChat = useCallback(
    (targetUserId: string) =>
      !targetUserId || targetUserId.toLowerCase() === currentUser?.toLowerCase()
        ? Promise.resolve(null)
        : openRoom('create_direct_chat', { targetUserId }),
    [currentUser, openRoom],
  );

  const createSecretChat = useCallback(
    (targetUserId: string) =>
      !targetUserId || targetUserId.toLowerCase() === currentUser?.toLowerCase()
        ? Promise.resolve(null)
        : openRoom('create_secret_chat', { targetUserId }),
    [currentUser, openRoom],
  );

  const createGroupChat = useCallback(
    (name: string, participantIds: string[], avatarUrl?: string) =>
      !name?.trim() ? Promise.resolve(null) : openRoom('create_group_chat', { name: name.trim(), participantIds, avatarUrl }),
    [openRoom],
  );

  // ===== Groups & channels =====
  const roomAction = useCallback(
    async <T extends object = object>(event: RoomEvent, payload: Record<string, unknown>) => {
      const res = await emitWithAck<RoomActionResult & Partial<T>>(event, payload, 8000);
      if (!res) return { ok: false, error: 'Нет соединения с сервером.' } as RoomActionResult & Partial<T>;
      // Apply our own change right away instead of waiting for `room_updated`.
      if (res.ok && res.room) upsertRoom(res.room);
      if (res.ok && (event === 'leave_room' || event === 'delete_room') && typeof payload.roomId === 'string') removeRoom(payload.roomId);
      return res;
    },
    [emitWithAck, upsertRoom, removeRoom],
  );

  const createChannel = useCallback(
    async (input: CreateChannelInput): Promise<RoomActionResult> => {
      if (!input.name?.trim()) return { ok: false, error: 'Укажите название канала' };
      const res = await emitWithAck<RoomActionResult>('create_channel', { ...input, name: input.name.trim() }, 8000);
      if (!res) return { ok: false, error: 'Нет соединения с сервером.' };
      if (res.ok && res.room) {
        upsertRoom(res.room);
        setActiveRoomId(res.room.id);
      }
      return res;
    },
    [emitWithAck, upsertRoom, setActiveRoomId],
  );

  const getInvitePreview = useCallback(
    async (target: JoinTarget) =>
      (await emitWithAck<{ ok: boolean; error?: string; room?: RoomPreview }>('get_invite_info', target, 6000)) ?? {
        ok: false,
        error: 'Нет соединения с сервером.',
      },
    [emitWithAck],
  );

  const joinRoom = useCallback(
    async (target: JoinTarget): Promise<RoomActionResult> => {
      const res = await emitWithAck<RoomActionResult>('join_room', target, 8000);
      if (!res) return { ok: false, error: 'Нет соединения с сервером.' };
      if (res.ok && res.room) {
        upsertRoom(res.room);
        setActiveRoomId(res.room.id);
      }
      return res;
    },
    [emitWithAck, upsertRoom, setActiveRoomId],
  );

  const searchPublicRooms = useCallback(
    async (query: string): Promise<RoomPreview[]> => {
      const q = (query || '').trim();
      if (q.replace(/^@/, '').length < 2) return [];
      const res = await emitWithAck<{ rooms?: RoomPreview[] }>('search_users', { query: q }, 3500);
      return res?.rooms || [];
    },
    [emitWithAck],
  );

  const currentUserProfile = currentUser ? userProfiles[currentUser] || DEFAULT_USER_PROFILES[currentUser] || null : null;
  const currentUserName = currentUser ? getUserDisplayName(currentUser) : null;

  const value = useMemo<RoomsContextValue>(
    () => ({
      rooms,
      activeRoomId: activeRoom?.id ?? activeRoomId,
      setActiveRoomId,
      activeRoom,
      onlineStatus,
      typingUsers,
      sendTypingStatus,
      userProfiles,
      currentUserProfile,
      currentUserName,
      updateUserProfile,
      getUserDisplayName,
      getUserAvatar,
      searchUsers,
      createDirectChat,
      createGroupChat,
      createSecretChat,
      createChannel,
      roomAction,
      getInvitePreview,
      joinRoom,
      searchPublicRooms,
    }),
    [
      rooms,
      activeRoom,
      activeRoomId,
      setActiveRoomId,
      onlineStatus,
      typingUsers,
      sendTypingStatus,
      userProfiles,
      currentUserProfile,
      currentUserName,
      updateUserProfile,
      getUserDisplayName,
      getUserAvatar,
      searchUsers,
      createDirectChat,
      createGroupChat,
      createSecretChat,
      createChannel,
      roomAction,
      getInvitePreview,
      joinRoom,
      searchPublicRooms,
    ],
  );

  return <RoomsContext.Provider value={value}>{children}</RoomsContext.Provider>;
};
