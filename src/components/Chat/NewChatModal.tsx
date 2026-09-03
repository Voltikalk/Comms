import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconSearch,
  IconX,
  IconUsers,
  IconUser,
  IconCheck,
  IconSparkles,
  IconArrowRight,
  IconLoader2,
  IconMessageCircle,
  IconUserPlus
} from '@tabler/icons-react';
import { useSocket } from '../../context/SocketContext';
import type { UserSearchResult } from '../../types';

export interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomOpened?: (roomId: string) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onRoomOpened }) => {
  const { currentUser, searchUsers, createDirectChat, createGroupChat } = useSocket();

  // Mode: 'direct' (find user to chat) | 'group' (select multiple users)
  const [mode, setMode] = useState<'direct' | 'group'>('direct');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Group creation state
  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const searchTimeoutRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Debounced search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchUsers(query);
        // Exclude current user
        const filtered = results.filter((u) => u.username !== currentUser && u.userId !== currentUser);
        setSearchResults(filtered);
        setHasSearched(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 220);
  }, [searchUsers, currentUser]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
      setSearchQuery('');
      setSearchResults([]);
      setHasSearched(false);
      setMode('direct');
      setSelectedUserIds([]);
      setSelectedUsers([]);
      setGroupName('');
      setCreateError(null);
      // Load initial suggestions
      handleSearch('');
    }
  }, [isOpen, handleSearch]);

  // Click on user in 'direct' mode
  const handleSelectDirectUser = async (user: UserSearchResult) => {
    setIsCreating(true);
    setCreateError(null);
    try {
      const room = await createDirectChat(user.username || user.userId);
      if (room) {
        if (onRoomOpened) onRoomOpened(room.id);
        onClose();
      } else {
        setCreateError('Не удалось создать диалог. Попробуйте еще раз.');
      }
    } catch (err: any) {
      setCreateError(err?.message || 'Ошибка создания диалога');
    } finally {
      setIsCreating(false);
    }
  };

  // Toggle user selection in 'group' mode
  const toggleUserInGroup = (user: UserSearchResult) => {
    const id = user.username || user.userId;
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds((prev) => prev.filter((i) => i !== id));
      setSelectedUsers((prev) => prev.filter((u) => (u.username || u.userId) !== id));
    } else {
      setSelectedUserIds((prev) => [...prev, id]);
      setSelectedUsers((prev) => [...prev, user]);
    }
  };

  // Submit group creation
  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setCreateError('Укажите название группы');
      return;
    }
    if (selectedUserIds.length === 0) {
      setCreateError('Выберите хотя бы одного участника');
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    try {
      const room = await createGroupChat(groupName.trim(), selectedUserIds);
      if (room) {
        if (onRoomOpened) onRoomOpened(room.id);
        onClose();
      } else {
        setCreateError('Не удалось создать группу');
      }
    } catch (err: any) {
      setCreateError(err?.message || 'Ошибка создания группы');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 14 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="w-full max-w-md bg-white dark:bg-[#1c242f] rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 flex flex-col max-h-[85vh]"
        >
          {/* Modal Header */}
          <div className="p-4 pb-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#3390ec]/10 text-[#3390ec] flex items-center justify-center">
                {mode === 'direct' ? <IconUserPlus size={18} /> : <IconUsers size={18} />}
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  {mode === 'direct' ? 'Новое сообщение' : 'Создание группы'}
                </h2>
                <p className="text-[11px] text-slate-400">
                  {mode === 'direct' ? 'Найдите человека по нику или имени' : `Выбрано участников: ${selectedUserIds.length}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <IconX size={18} />
              </button>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="px-4 pt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setMode('direct')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'direct'
                  ? 'bg-[#3390ec] text-white shadow-md shadow-[#3390ec]/25'
                  : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/10'
              }`}
            >
              <IconUser size={15} />
              <span>Личный диалог</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('group')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'group'
                  ? 'bg-[#3390ec] text-white shadow-md shadow-[#3390ec]/25'
                  : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/10'
              }`}
            >
              <IconUsers size={15} />
              <span>Создать группу</span>
            </button>
          </div>

          {/* Group Name input if in group mode */}
          {mode === 'group' && (
            <div className="px-4 pt-3">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Название новой группы..."
                className="w-full px-3.5 py-2.5 bg-black/5 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3390ec]"
              />

              {/* Selected members chips */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5 max-h-20 overflow-y-auto">
                  {selectedUsers.map((u) => {
                    const uId = u.username || u.userId;
                    return (
                      <span
                        key={uId}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#3390ec]/15 text-[#3390ec] dark:text-[#64b5f6] rounded-full text-[11px] font-medium"
                      >
                        <span>{u.displayName || u.username}</span>
                        <button
                          type="button"
                          onClick={() => toggleUserInGroup(u)}
                          className="hover:opacity-75 cursor-pointer ml-0.5"
                        >
                          <IconX size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Search Bar */}
          <div className="p-4 pb-2">
            <div className="relative">
              <IconSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Поиск по @username или имени..."
                className="w-full pl-9 pr-8 py-2.5 bg-black/5 dark:bg-white/5 border border-transparent focus:border-[#3390ec]/40 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3390ec] transition-all"
              />
              {isSearching && (
                <IconLoader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
              )}
              {!isSearching && searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <IconX size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Error notice */}
          {createError && (
            <div className="mx-4 mb-2 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs">
              {createError}
            </div>
          )}

          {/* User Results List */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 custom-scrollbar">
            {searchResults.length > 0 ? (
              searchResults.map((user) => {
                const uId = user.username || user.userId;
                const isSelected = selectedUserIds.includes(uId);

                return (
                  <div
                    key={uId}
                    onClick={() => {
                      if (mode === 'direct') {
                        handleSelectDirectUser(user);
                      } else {
                        toggleUserInGroup(user);
                      }
                    }}
                    className={`w-full p-2.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-[#3390ec]/15 border border-[#3390ec]/30'
                        : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.displayName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#3390ec] to-[#00d2ff] text-white flex items-center justify-center font-bold text-sm">
                            {(user.displayName || user.username || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        {user.isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#1c242f]" />
                        )}
                      </div>

                      {/* Name and username */}
                      <div className="min-w-0 text-left">
                        <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {user.displayName || user.username}
                        </div>
                        <div className="text-[11px] text-[#3390ec] dark:text-[#64b5f6] font-medium flex items-center gap-1.5">
                          <span>@{user.username}</span>
                          {user.bio && (
                            <span className="text-slate-400 font-normal truncate max-w-[150px]">
                              · {user.bio}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Indicator */}
                    <div className="shrink-0 ml-2">
                      {mode === 'direct' ? (
                        <div className="w-8 h-8 rounded-full bg-[#3390ec]/10 text-[#3390ec] flex items-center justify-center hover:bg-[#3390ec] hover:text-white transition-colors">
                          <IconMessageCircle size={16} />
                        </div>
                      ) : (
                        <div
                          className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-[#3390ec] border-[#3390ec] text-white'
                              : 'border-slate-300 dark:border-white/20'
                          }`}
                        >
                          {isSelected && <IconCheck size={14} className="stroke-[2.5]" />}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : hasSearched && !isSearching ? (
              <div className="py-10 text-center text-slate-400">
                <IconSparkles size={32} className="mx-auto mb-2 opacity-40 text-[#3390ec]" />
                <p className="text-xs font-medium">Пользователь не найден</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Проверьте правильность написания @username</p>
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400">
                <IconSearch size={32} className="mx-auto mb-2 opacity-30 text-slate-400" />
                <p className="text-xs font-medium">Введите никнейм или имя</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Поиск доступен по всем зарегистрированным пользователям</p>
              </div>
            )}
          </div>

          {/* Group Mode Action Footer */}
          {mode === 'group' && (
            <div className="p-4 pt-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {selectedUserIds.length > 0
                  ? `Участников: ${selectedUserIds.length}`
                  : 'Выберите участников'}
              </span>

              <button
                type="button"
                disabled={isCreating || selectedUserIds.length === 0 || !groupName.trim()}
                onClick={handleCreateGroupSubmit}
                className="px-4 py-2 bg-[#3390ec] hover:bg-[#2880d9] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-[#3390ec]/25 transition-all cursor-pointer"
              >
                {isCreating ? (
                  <IconLoader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <span>Создать группу</span>
                    <IconArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
