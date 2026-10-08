import React, { useEffect, useState } from 'react';
import { IconSpeakerphone, IconUsers } from '@tabler/icons-react';
import { useRooms } from '../../../context/contexts';
import { pluralRu } from '../../../lib/roles';
import type { RoomPreview } from '../../../types';

/** «Глобальный поиск» under the chat list: public groups & channels the user hasn't joined yet. */
export const PublicRoomResults: React.FC<{ query: string; compact?: boolean }> = ({ query, compact }) => {
  const { searchPublicRooms } = useRooms();
  const [results, setResults] = useState<RoomPreview[]>([]);
  const q = query.trim();

  useEffect(() => {
    let alive = true;
    if (q.replace(/^@/, '').length < 2) {
      setResults([]);
      return;
    }
    const t = window.setTimeout(() => {
      void searchPublicRooms(q).then((rooms) => alive && setResults(rooms.filter((r) => !r.isMember)));
    }, 280);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [q, searchPublicRooms]);

  if (compact || results.length === 0) return null;

  return (
    <div className="mt-1">
      <div className="px-3 pb-1 pt-2 text-[12.5px] font-semibold text-muted">Глобальный поиск</div>
      {results.map((room) => {
        const channel = room.type === 'channel';
        return (
          <button
            key={room.id}
            type="button"
            // ChatScreen listens for `#/join/...` and opens the invite card.
            onClick={() => {
              window.location.hash = `#/join/@${encodeURIComponent(room.username || '')}`;
            }}
            className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-elevated cursor-pointer"
          >
            <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent to-accent-strong text-white">
              {room.avatarUrl ? (
                <img src={room.avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} />
              ) : channel ? (
                <IconSpeakerphone size={22} />
              ) : (
                <IconUsers size={22} />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-ink">{room.name}</span>
              <span className="block truncate text-[13px] text-muted">
                @{room.username} · {room.memberCount}{' '}
                {channel
                  ? pluralRu(room.memberCount, 'подписчик', 'подписчика', 'подписчиков')
                  : pluralRu(room.memberCount, 'участник', 'участника', 'участников')}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
};
