import React from 'react';
import { motion } from 'framer-motion';
import type { Room } from '../../lib/supabase/types';

export interface RoomItemProps {
  room: Room;
  isActive?: boolean;
  unreadCount?: number;
  lastMessageSnippet?: string;
  lastMessageTime?: string;
  onClick: () => void;
}

export const RoomItem: React.FC<RoomItemProps> = ({
  room,
  isActive = false,
  unreadCount = 0,
  lastMessageSnippet = 'Нажмите для открытия диалога',
  lastMessageTime,
  onClick,
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`relative flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
        isActive
          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-white shadow-lg shadow-cyan-500/10'
          : 'hover:bg-white/5 text-white/80 border border-transparent'
      }`}
    >
      {/* Room Avatar */}
      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border border-white/20 bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-semibold text-white shadow-inner">
        {room.avatar_url ? (
          <img src={room.avatar_url} alt={room.name} className="h-full w-full object-cover" />
        ) : (
          <span>{room.name.charAt(0).toUpperCase()}</span>
        )}
      </div>

      {/* Room Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white/95 truncate">
            {room.name}
          </h3>
          {lastMessageTime && (
            <span className="text-[11px] text-white/40">
              {lastMessageTime}
            </span>
          )}
        </div>
        <p className="text-xs text-white/50 truncate mt-0.5">
          {lastMessageSnippet}
        </p>
      </div>

      {/* Unread Counter Badge */}
      {unreadCount > 0 && (
        <span className="flex-shrink-0 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-cyan-500 text-[11px] font-bold text-black shadow-md shadow-cyan-500/30">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </motion.div>
  );
};

export default RoomItem;
