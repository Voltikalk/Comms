import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { IconCheck, IconLoader2, IconSearch, IconStar, IconX } from '@tabler/icons-react';
import { useStories } from '../../context/stories-context';
import { useAuth, useRooms } from '../../context/contexts';
import type { UserId } from '../../types';

/**
 * «Близкие друзья» editor, shared by the composer and the viewer. Until the
 * user saves a list, every contact (anyone they share a chat with) counts as
 * a close friend — that is what the server does with no list (`null`).
 */
export const CloseFriendsSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { closeFriends, saveCloseFriends } = useStories();
  const { rooms, getUserDisplayName, getUserAvatar } = useRooms();
  const me = (useAuth().currentUser ?? '').toLowerCase();

  const contacts = useMemo(() => {
    const ids = new Set<string>();
    for (const r of rooms) {
      const parts = r.participants.map((p) => String(p).toLowerCase());
      if (!parts.includes(me)) continue;
      for (const p of parts) if (p !== me) ids.add(p);
    }
    return [...ids].sort((a, b) => getUserDisplayName(a as UserId).localeCompare(getUserDisplayName(b as UserId), 'ru'));
  }, [rooms, me, getUserDisplayName]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(closeFriends ?? contacts));
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const q = query.trim().toLowerCase();
  const shown = q ? contacts.filter((id) => id.includes(q) || getUserDisplayName(id as UserId).toLowerCase().includes(q)) : contacts;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = async (list: string[] | null) => {
    setSaving(true);
    setError(false);
    const ok = await saveCloseFriends(list);
    setSaving(false);
    if (ok) onClose();
    else setError(true);
  };

  const allSelected = contacts.length > 0 && contacts.every((id) => selected.has(id));

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Близкие друзья"
        className="flex max-h-[min(640px,88dvh)] w-full max-w-[420px] flex-col overflow-hidden rounded-t-[22px] bg-[#1c1c1f] text-white ring-1 ring-white/10 sm:rounded-[22px]"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 38 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 pb-2 pt-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#32d74b] text-black">
            <IconStar size={19} stroke={2.4} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-semibold">Близкие друзья</p>
            <p className="text-[12.5px] text-white/50">
              {closeFriends === null ? 'Сейчас — все контакты' : `Выбрано: ${selected.size} из ${contacts.length}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 cursor-pointer hover:bg-white/15"
          >
            <IconX size={17} />
          </button>
        </div>

        <div className="px-4 pb-2">
          <label className="flex items-center gap-2 rounded-xl bg-white/[0.07] px-3 py-2 focus-within:bg-white/10">
            <IconSearch size={16} className="text-white/45" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск контактов"
              className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-white/40"
            />
          </label>
          {contacts.length > 1 && (
            <button
              type="button"
              onClick={() => setSelected(allSelected ? new Set() : new Set(contacts))}
              className="mt-2 text-[13px] font-medium text-[#32d74b] cursor-pointer hover:underline"
            >
              {allSelected ? 'Снять всех' : 'Выбрать всех'}
            </button>
          )}
        </div>

        <div className="min-h-[120px] flex-1 overflow-y-auto px-2 pb-2">
          {shown.length === 0 ? (
            <p className="px-6 py-10 text-center text-[13.5px] text-white/50">
              {contacts.length === 0 ? 'Пока нет контактов — начните с кем-нибудь чат' : 'Никого не найдено'}
            </p>
          ) : (
            shown.map((id) => {
              const name = getUserDisplayName(id as UserId);
              const src = getUserAvatar(id as UserId);
              const on = selected.has(id);
              return (
                <button
                  key={id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(id)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left cursor-pointer transition-colors hover:bg-white/[0.06]"
                >
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 text-[16px] font-semibold">
                    {src ? <img src={src} alt="" className="h-full w-full object-cover" draggable={false} /> : (name.trim().charAt(0) || '?').toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-medium">{name}</span>
                    <span className="block truncate text-[12px] text-white/40">@{id}</span>
                  </span>
                  <span
                    className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full transition-colors ${
                      on ? 'bg-[#32d74b] text-black' : 'ring-[1.5px] ring-inset ring-white/30'
                    }`}
                  >
                    {on && <IconCheck size={14} stroke={3} />}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-white/[0.08] p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          {error && <p className="text-center text-[12.5px] text-[#ff6b6b]">Не удалось сохранить — проверьте соединение</p>}
          <div className="flex gap-2">
            {closeFriends !== null && (
              <button
                type="button"
                disabled={saving}
                onClick={() => save(null)}
                title="Близкими друзьями снова станут все контакты"
                className="rounded-xl bg-white/10 px-3.5 py-2.5 text-[14px] font-medium cursor-pointer hover:bg-white/15 disabled:opacity-50"
              >
                Сбросить
              </button>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={() => save([...selected])}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#32d74b] py-2.5 text-[14px] font-semibold text-black cursor-pointer hover:brightness-110 disabled:opacity-60"
            >
              {saving && <IconLoader2 size={16} className="animate-spin" />}
              Сохранить
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};
