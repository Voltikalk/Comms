import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IconCheck, IconHourglass, IconLock } from '@tabler/icons-react';
import { useMessages } from '../../../context/contexts';
import { SECRET_TTL_OPTIONS } from '../../../lib/e2ee';
import { fingerprintGrid, formatFingerprint } from '../../../lib/secret-sessions';

const SPRING = { type: 'spring', stiffness: 400, damping: 28 } as const;
/** Identicon palette (Telegram uses 4 shades of the accent colour). */
const GRID_COLORS = ['#ffffff', '#d5e6f3', '#2d5775', '#2f99c9'];

/** Short label for the header timer button: "10с", "1м", "1ч", "1д". */
const ttlShort = (ttl: number) => (ttl < 60 ? `${ttl}с` : ttl < 3600 ? `${ttl / 60}м` : ttl < 86400 ? `${ttl / 3600}ч` : `${ttl / 86400}д`);

/**
 * Header control for E2EE secret chats: self-destruct timer picker and the
 * encryption key visualisation (identicon + hex fingerprint) for out-of-band
 * verification.
 */
export const SecretChatMenu: React.FC<{ roomId: string }> = ({ roomId }) => {
  const { secretTtl, setSecretTtl, secretFingerprint } = useMessages();
  const [open, setOpen] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | null | undefined>(undefined);
  const ttl = secretTtl(roomId);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    secretFingerprint(roomId).then((fp) => {
      if (!cancelled) setFingerprint(fp);
    });
    return () => {
      cancelled = true;
    };
  }, [open, roomId, secretFingerprint]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`h-9 min-w-9 px-2 rounded-full flex items-center justify-center gap-1 cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${
          ttl ? 'text-emerald-500' : 'text-slate-500 dark:text-slate-400'
        }`}
        title="Таймер самоуничтожения и ключ шифрования"
        aria-label="Секретный чат: таймер и ключ"
        aria-expanded={open}
      >
        <IconHourglass size={19} />
        {ttl && <span className="text-[11px] font-bold">{ttlShort(ttl)}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={SPRING}
              className="tg-glass absolute right-0 top-11 z-50 w-64 rounded-2xl bg-white/95 dark:bg-[#17212b]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl p-3 select-none origin-top-right"
            >
              <div className="flex items-center gap-2 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                <IconLock size={15} /> Сквозное шифрование
              </div>
              <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                ECDH P-256 + AES-GCM 256. Сервер хранит только шифротекст.
              </p>

              <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Самоуничтожение</div>
              <div className="mt-1.5 grid grid-cols-5 gap-1">
                {[{ value: undefined, label: 'Выкл' }, ...SECRET_TTL_OPTIONS].map((o) => {
                  const active = ttl === o.value;
                  return (
                    <button
                      key={o.label}
                      type="button"
                      onClick={() => setSecretTtl(roomId, o.value)}
                      className={`relative py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                        active
                          ? 'bg-emerald-500 text-white'
                          : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/10'
                      }`}
                      aria-pressed={active}
                    >
                      {o.value ? ttlShort(o.value) : o.label}
                      {active && <IconCheck size={10} className="absolute top-0.5 right-0.5" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Ключ шифрования</div>
              {fingerprint === undefined ? (
                <p className="mt-1.5 text-[11px] text-slate-400">Загрузка…</p>
              ) : fingerprint === null ? (
                <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                  Собеседник ещё не опубликовал ключ — он появится, когда тот выйдет в сеть.
                </p>
              ) : (
                <div className="mt-1.5 flex items-center gap-2.5">
                  <div className="grid grid-cols-8 w-16 h-16 shrink-0 rounded-md overflow-hidden border border-slate-200 dark:border-white/10" aria-hidden>
                    {fingerprintGrid(fingerprint).map((c, i) => (
                      <span key={i} style={{ background: GRID_COLORS[c] }} />
                    ))}
                  </div>
                  <code className="text-[10px] leading-relaxed font-mono text-slate-600 dark:text-slate-300 break-all">
                    {formatFingerprint(fingerprint)}
                  </code>
                </div>
              )}
              {fingerprint && (
                <p className="mt-1.5 text-[10.5px] leading-snug text-slate-400">
                  Если изображение совпадает с тем, что видит собеседник, переписка защищена.
                </p>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SecretChatMenu;
