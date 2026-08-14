import React, { useState, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { 
  IconX, 
  IconCheck, 
  IconCamera, 
  IconTrash, 
  IconAt, 
  IconPhone, 
  IconSparkles,
  IconUser,
  IconFileText
} from '@tabler/icons-react';

interface ProfileEditModalProps {
  onClose: () => void;
  onToast: (message: string) => void;
}

const AVATAR_PRESET_COLORS = [
  { name: 'Индиго', class: 'bg-indigo-600' },
  { name: 'Розовый', class: 'bg-pink-600' },
  { name: 'Изумруд', class: 'bg-emerald-600' },
  { name: 'Небесный', class: 'bg-sky-600' },
  { name: 'Янтарный', class: 'bg-amber-600' },
  { name: 'Пурпурный', class: 'bg-purple-600' },
  { name: 'Красный', class: 'bg-rose-600' },
  { name: 'Оранжевый', class: 'bg-orange-600' },
];

const STATUS_EMOJI_PRESETS = [
  '⚡', '❤️', '👑', '🔥', '🚀', '💻', '☕', '🎮', '🌸', '💎', '🐱', '✨'
];

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ onClose, onToast }) => {
  const { currentUserProfile, updateUserProfile } = useSocket();

  const [firstName, setFirstName] = useState(currentUserProfile?.firstName || '');
  const [lastName, setLastName] = useState(currentUserProfile?.lastName || '');
  const [bio, setBio] = useState(currentUserProfile?.bio || '');
  const [username, setUsername] = useState(currentUserProfile?.username || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUserProfile?.phoneNumber || '+7 (999) 000-00-00');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(currentUserProfile?.avatarUrl);
  const [statusEmoji, setStatusEmoji] = useState(currentUserProfile?.statusEmoji || '');
  const [selectedColor, setSelectedColor] = useState('bg-indigo-600');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      onToast('Размер файла превышает 5 МБ');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(reader.result as string);
      onToast('Фотография загружена');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      onToast('Имя не может быть пустым');
      return;
    }

    updateUserProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      bio: bio.trim(),
      username: username.trim().replace(/^@/, ''),
      phoneNumber: phoneNumber.trim(),
      avatarUrl,
      statusEmoji
    });

    onToast('Профиль успешно сохранён');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-backdrop"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md tg-header rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden animate-pop-in text-slate-900 dark:text-white max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
              title="Закрыть"
            >
              <IconX size={20} />
            </button>
            <h3 className="font-bold text-base m-0">Редактировать профиль</h3>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="p-1.5 rounded-full text-[#3390ec] hover:bg-[#3390ec]/10 cursor-pointer transition-colors"
            title="Сохранить"
          >
            <IconCheck size={22} stroke={2.5} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Avatar Section */}
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Avatar" 
                  className="w-24 h-24 rounded-full object-cover shadow-md ring-4 ring-[#3390ec]/20"
                />
              ) : (
                <div className={`w-24 h-24 rounded-full ${selectedColor} text-white flex items-center justify-center text-3xl font-bold shadow-md ring-4 ring-[#3390ec]/20`}>
                  {firstName.charAt(0).toUpperCase() || <IconUser size={36} />}
                </div>
              )}

              {/* Camera Overlay */}
              <div className="absolute inset-0 rounded-full bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs text-white">
                <IconCamera size={26} />
                <span className="text-[10px] font-semibold mt-0.5">Изменить</span>
              </div>

              {/* Status Emoji Badge */}
              {statusEmoji && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-[#17212b] shadow-md flex items-center justify-center text-sm border-2 border-white dark:border-[#17212b]">
                  {statusEmoji}
                </div>
              )}
            </div>

            <input 
              ref={fileInputRef} 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleAvatarUpload} 
            />

            {/* Avatar action buttons */}
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-[#3390ec] hover:underline cursor-pointer flex items-center gap-1"
              >
                <IconCamera size={15} />
                <span>Выбрать фото</span>
              </button>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl(undefined)}
                  className="text-xs font-semibold text-rose-500 hover:underline cursor-pointer flex items-center gap-1 ml-2"
                >
                  <IconTrash size={15} />
                  <span>Удалить фото</span>
                </button>
              )}
            </div>

            {/* Preset Color Pickers (if no photo uploaded) */}
            {!avatarUrl && (
              <div className="flex items-center gap-1.5 mt-3">
                {AVATAR_PRESET_COLORS.map((col) => (
                  <button
                    key={col.class}
                    type="button"
                    onClick={() => setSelectedColor(col.class)}
                    className={`w-5 h-5 rounded-full ${col.class} cursor-pointer transition-transform ${
                      selectedColor === col.class ? 'scale-125 ring-2 ring-white shadow-xs' : 'hover:scale-110 opacity-80'
                    }`}
                    title={col.name}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Name Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Имя (обязательно)
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ваше имя"
                required
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#242f3d] border border-transparent focus:border-[#3390ec] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Фамилия (опционально)
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ваша фамилия"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#242f3d] border border-transparent focus:border-[#3390ec] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Bio Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <IconFileText size={14} />
                <span>О себе</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400">
                {bio.length}/70
              </span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => {
                if (e.target.value.length <= 70) {
                  setBio(e.target.value);
                }
              }}
              rows={2}
              placeholder="Любые подробности, например: возраст, статус или город"
              className="w-full px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-[#242f3d] border border-transparent focus:border-[#3390ec] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors resize-none"
            />
            <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
              Любые подробности о вас, которые увидят другие пользователи.
            </span>
          </div>

          {/* Username Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Имя пользователя
            </label>
            <div className="relative">
              <IconAt size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="username"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#242f3d] border border-transparent focus:border-[#3390ec] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors font-mono"
              />
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
              По этому имени другие пользователи смогут найти вас в поиске.
            </span>
          </div>

          {/* Status Emoji Preset Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <IconSparkles size={14} className="text-amber-400" />
                <span>Эмодзи-статус</span>
              </label>
              {statusEmoji && (
                <button
                  type="button"
                  onClick={() => setStatusEmoji('')}
                  className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                >
                  Сбросить
                </button>
              )}
            </div>
            <div className="grid grid-cols-6 gap-1.5 p-2 rounded-2xl bg-slate-100 dark:bg-[#242f3d]">
              {STATUS_EMOJI_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setStatusEmoji(statusEmoji === emoji ? '' : emoji)}
                  className={`h-9 rounded-xl flex items-center justify-center text-lg cursor-pointer transition-all ${
                    statusEmoji === emoji 
                      ? 'bg-[#3390ec] text-white shadow-xs scale-110' 
                      : 'hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Phone Number (Display) */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Номер телефона
            </label>
            <div className="relative">
              <IconPhone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+7 (999) 000-00-00"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#242f3d] border border-transparent focus:border-[#3390ec] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2 bg-black/2 dark:bg-white/2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white tg-btn-primary shadow-md cursor-pointer transition-transform active:scale-95"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};
