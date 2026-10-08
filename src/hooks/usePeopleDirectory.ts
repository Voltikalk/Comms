import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth, useRooms } from '../context/contexts';
import type { UserSearchResult } from '../types';

const matches = (u: UserSearchResult, q: string) =>
  u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q);

/** Online first, then alphabetical — like the Telegram contact list. */
const byPresenceThenName = (a: UserSearchResult, b: UserSearchResult) =>
  Number(!!b.isOnline) - Number(!!a.isOnline) || a.displayName.localeCompare(b.displayName, 'ru');

/**
 * People for "Новое сообщение" / "Контакты": everyone you already share a chat
 * with (the server search returns nothing for an empty query), plus directory
 * matches while typing.
 */
export function usePeopleDirectory(query: string) {
  const { currentUser } = useAuth();
  const { rooms, userProfiles, onlineStatus, getUserDisplayName, searchUsers } = useRooms();
  const [remote, setRemote] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const seq = useRef(0);
  const q = query.trim().toLowerCase().replace(/^@/, '');

  const known = useMemo(() => {
    const me = currentUser?.toLowerCase();
    const seen = new Map<string, UserSearchResult>();
    // Direct chats first so 1:1 partners win over people only seen in groups.
    const ordered = [...rooms].sort((a, b) => Number(b.type === 'direct') - Number(a.type === 'direct'));
    for (const room of ordered) {
      for (const id of room.participants) {
        const key = id.toLowerCase();
        if (key === me || seen.has(key)) continue;
        const profile = userProfiles[id];
        seen.set(key, {
          userId: id,
          username: profile?.username || id,
          displayName: getUserDisplayName(id),
          avatarUrl: profile?.avatarUrl,
          bio: profile?.bio,
          isOnline: !!onlineStatus[id],
        });
      }
    }
    return [...seen.values()];
  }, [rooms, userProfiles, onlineStatus, getUserDisplayName, currentUser]);

  useEffect(() => {
    const id = ++seq.current;
    if (!q) {
      setRemote([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await searchUsers(q);
        if (id === seq.current) setRemote(res);
      } catch {
        if (id === seq.current) setRemote([]);
      } finally {
        if (id === seq.current) setSearching(false);
      }
    }, 220);
    return () => window.clearTimeout(t);
  }, [q, searchUsers]);

  const people = useMemo(() => {
    const me = currentUser?.toLowerCase();
    const list = q ? known.filter((u) => matches(u, q)) : [...known];
    const have = new Set(list.map((u) => u.username.toLowerCase()));
    for (const u of remote) {
      const key = u.username.toLowerCase();
      if (key === me || u.userId.toLowerCase() === me || have.has(key)) continue;
      have.add(key);
      list.push(u);
    }
    return list.sort(byPresenceThenName);
  }, [known, remote, q, currentUser]);

  return { people, searching, isQuery: q.length > 0 };
}
