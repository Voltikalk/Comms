import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase/client';
import { StorageService } from '../../services/storage.service';
import type { User } from '../../lib/supabase/types';

export interface UserProfileProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (updated: User) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  isOpen,
  onClose,
  onProfileUpdated,
}) => {
  const [displayName, setDisplayName] = useState(user.display_name || '');
  const [username, setUsername] = useState(user.username || '');
  const [bio, setBio] = useState(user.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploadingAvatar(true);
      setErrorMsg(null);

      try {
        const publicUrl = await StorageService.uploadAvatar(file, user.id);
        setAvatarUrl(publicUrl);
        setSuccessMsg('Аватар успешно загружен!');
      } catch (err: any) {
        setErrorMsg(err.message || 'Ошибка загрузки аватара');
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          display_name: displayName.trim(),
          username: username.trim().toLowerCase(),
          bio: bio.trim(),
          avatar_url: avatarUrl,
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error || !data) {
        throw error;
      }

      setSuccessMsg('Профиль сохранен в Supabase!');
      if (onProfileUpdated) {
        onProfileUpdated(data);
      }
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ошибка сохранения профиля');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900/90 backdrop-blur-2xl shadow-2xl p-6 text-white space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              Редактирование профиля
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-white/50 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-24 w-24 cursor-pointer overflow-hidden rounded-full border-2 border-cyan-400/50 bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold">
                  {displayName.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs font-medium text-white">Изменить</span>
              </div>
            </div>
            {isUploadingAvatar && (
              <p className="text-xs text-cyan-400 animate-pulse">
                Сжатие и загрузка аватара...
              </p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="text-white/60 block mb-1">Имя пользователя (@username)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-white/60 block mb-1">Отображаемое имя</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-white/60 block mb-1">О себе (Bio)</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                placeholder="Расскажите о себе..."
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* Notifications */}
            {successMsg && (
              <p className="text-xs text-emerald-400 font-medium">✓ {successMsg}</p>
            )}
            {errorMsg && (
              <p className="text-xs text-red-400 font-medium">⚠️ {errorMsg}</p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-white/10 py-2.5 text-xs font-semibold text-white/80 hover:bg-white/20 transition-all"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 hover:scale-[1.02] transition-all disabled:opacity-50"
              >
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UserProfile;
