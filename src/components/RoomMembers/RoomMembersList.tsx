import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RoomService } from '../../services/room.service';
import type { RoomMember, UserRole } from '../../lib/supabase/types';

export interface RoomMembersListProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  isCurrentUserAdmin?: boolean;
}

export const RoomMembersList: React.FC<RoomMembersListProps> = ({
  roomId,
  isOpen,
  onClose,
  currentUserId,
  isCurrentUserAdmin = false,
}) => {
  const [members, setMembers] = useState<(RoomMember & { profile?: any })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    RoomService.getRoomById(roomId)
      .then((roomData) => {
        if (roomData?.members) {
          setMembers(roomData.members);
        }
      })
      .finally(() => setIsLoading(false));
  }, [roomId, isOpen]);

  const handleRoleChange = async (memberId: string, newRole: UserRole) => {
    await RoomService.addMemberToRoom(roomId, memberId, newRole);
    setMembers((prev) =>
      prev.map((m) => (m.user_id === memberId ? { ...m, role: newRole } : m))
    );
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Удалить участника из комнаты?')) return;
    await RoomService.removeMemberFromRoom(roomId, memberId);
    setMembers((prev) => prev.filter((m) => m.user_id !== memberId));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900/90 backdrop-blur-2xl shadow-2xl p-6 text-white space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-base font-bold text-white">Участники комнаты</h2>
              <p className="text-xs text-white/50">{members.length} участников</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-white/50 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Members List */}
          <div className="max-h-80 overflow-y-auto space-y-2 custom-scrollbar">
            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-xl bg-white/10" />
                ))}
              </div>
            ) : (
              members.map((m) => {
                const isSelf = m.user_id === currentUserId;
                const userObj = (m as any).users || {};

                return (
                  <div
                    key={m.id || m.user_id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/20 bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-sm">
                        {userObj.avatar_url ? (
                          <img src={userObj.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span>{(userObj.display_name || userObj.username || 'U').charAt(0).toUpperCase()}</span>
                        )}
                      </div>

                      {/* Name & Role */}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-white/90">
                            {userObj.display_name || userObj.username || 'Пользователь'}
                          </p>
                          {isSelf && <span className="text-[10px] text-cyan-400 font-medium">(Вы)</span>}
                        </div>
                        <p className="text-xs text-white/40">
                          @{userObj.username || m.user_id}
                        </p>
                      </div>
                    </div>

                    {/* Role Badge & Actions */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          m.role === 'admin'
                            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                            : m.role === 'moderator'
                            ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                            : 'bg-white/10 text-white/60'
                        }`}
                      >
                        {m.role}
                      </span>

                      {/* Admin Controls */}
                      {isCurrentUserAdmin && !isSelf && (
                        <div className="flex items-center gap-1">
                          {m.role !== 'admin' ? (
                            <button
                              onClick={() => handleRoleChange(m.user_id, 'admin')}
                              className="p-1 text-xs hover:text-amber-400 text-white/40 transition-colors"
                              title="Сделать админом"
                            >
                              ⭐
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRoleChange(m.user_id, 'member')}
                              className="p-1 text-xs hover:text-white text-white/40 transition-colors"
                              title="Разжаловать до участника"
                            >
                              ⬇️
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveMember(m.user_id)}
                            className="p-1 text-xs hover:text-red-400 text-white/40 transition-colors"
                            title="Удалить из комнаты"
                          >
                            ❌
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default RoomMembersList;
