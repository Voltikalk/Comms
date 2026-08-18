import React, { useState, useEffect, useMemo } from 'react';
import { RoomService } from '../../services/room.service';
import { RoomItem } from './RoomItem';
import type { Room } from '../../lib/supabase/types';

export interface RoomListProps {
  userId: string;
  activeRoomId?: string;
  onSelectRoom: (room: Room) => void;
  onCreateRoomClick?: () => void;
}

export const RoomList: React.FC<RoomListProps> = ({
  userId,
  activeRoomId,
  onSelectRoom,
  onCreateRoomClick,
}) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    RoomService.getRooms(userId)
      .then((data) => {
        if (isMounted) {
          setRooms(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Ошибка загрузки диалогов');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return rooms;
    return rooms.filter((r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [rooms, searchQuery]);

  return (
    <div className="flex h-full flex-col bg-black/40 backdrop-blur-xl border-r border-white/10 w-full">
      {/* Header & Search */}
      <div className="p-4 border-b border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-wide">
            Диалоги
          </h2>
          {onCreateRoomClick && (
            <button
              onClick={onCreateRoomClick}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all text-xs flex items-center gap-1 font-medium"
              title="Создать новую комнату"
            >
              <span>+</span> Создать
            </button>
          )}
        </div>

        {/* Search Box */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по диалогам..."
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 pl-9 text-xs text-white placeholder-white/40 focus:border-cyan-400 focus:bg-white/10 focus:outline-none transition-all"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-white/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Room Items List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {isLoading && (
          <div className="space-y-2 p-2 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5">
                <div className="h-12 w-12 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-28 rounded bg-white/10" />
                  <div className="h-3 w-40 rounded bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="p-4 text-center text-xs text-red-400">
            <p>⚠️ {error}</p>
          </div>
        )}

        {!isLoading && filteredRooms.length === 0 && (
          <div className="py-12 text-center text-xs text-white/40">
            {searchQuery ? 'Ничего не найдено' : 'Нет доступных диалогов'}
          </div>
        )}

        {!isLoading &&
          filteredRooms.map((room) => (
            <RoomItem
              key={room.id}
              room={room}
              isActive={room.id === activeRoomId}
              onClick={() => onSelectRoom(room)}
            />
          ))}
      </div>
    </div>
  );
};

export default RoomList;
