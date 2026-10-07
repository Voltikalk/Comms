import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { IconDevices, IconEye, IconEyeOff, IconLock, IconLockOpen, IconShieldLock, IconX } from '@tabler/icons-react';
import authService from '../../services/auth.service';
import type { AuthSessionInfo } from '../../types';
import type { TwoFactorStatus } from '../../types/auth.types';
import { formatLastActive, sessionIcon, sortSessions, validateCloudPasswordForm } from '../../lib/sessions';

const SPRING = { type: 'spring', stiffness: 400, damping: 28 } as const;

type PasswordMode = 'idle' | 'set' | 'change' | 'disable';

const errorText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl text-[13.5px] bg-slate-100/80 dark:bg-[#0E1621]/90 border border-slate-200/80 dark:border-white/[0.08] focus:border-[#3390EC] focus:ring-4 focus:ring-[#3390EC]/15 outline-hidden transition-all text-slate-900 dark:text-white placeholder:text-slate-400';

interface SecuritySettingsModalProps {
  onClose: () => void;
}

/**
 * «Конфиденциальность и безопасность»: active sessions (list / terminate one /
 * terminate all others) and the cloud password (2FA) — set, change, disable.
 * Talks to `/api/auth/sessions*` and `/api/auth/2fa*` through `authService`.
 */
export const SecuritySettingsModal: React.FC<SecuritySettingsModalProps> = ({ onClose }) => {
  const [sessions, setSessions] = useState<AuthSessionInfo[] | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);
  const [confirmTerminateAll, setConfirmTerminateAll] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [twoFactor, setTwoFactor] = useState<TwoFactorStatus | null>(null);
  const [mode, setMode] = useState<PasswordMode>('idle');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hint, setHint] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      setSessions(sortSessions(await authService.listSessions()));
      setSessionsError(null);
    } catch (err) {
      setSessionsError(errorText(err, 'Не удалось загрузить сеансы'));
    }
  }, []);

  useEffect(() => {
    void loadSessions();
    authService
      .getTwoFactorStatus()
      .then(setTwoFactor)
      .catch(() => setTwoFactor({ enabled: false }));
  }, [loadSessions]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const terminateOne = async (id: string) => {
    setBusySessionId(id);
    try {
      await authService.terminateSession(id);
      setSessions((prev) => prev?.filter((s) => s.id !== id) ?? prev);
      setNotice('Сеанс завершён');
    } catch (err) {
      setSessionsError(errorText(err, 'Не удалось завершить сеанс'));
    } finally {
      setBusySessionId(null);
    }
  };

  const terminateOthers = async () => {
    setConfirmTerminateAll(false);
    setBusySessionId('*');
    try {
      const n = await authService.terminateOtherSessions();
      setNotice(n > 0 ? `Завершено сеансов: ${n}` : 'Других сеансов нет');
      await loadSessions();
    } catch (err) {
      setSessionsError(errorText(err, 'Не удалось завершить сеансы'));
    } finally {
      setBusySessionId(null);
    }
  };

  const resetForm = (next: PasswordMode = 'idle') => {
    setMode(next);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setHint(next === 'change' ? twoFactor?.hint ?? '' : '');
    setFormError(null);
    setShowPasswords(false);
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formBusy) return;
    if (mode !== 'disable') {
      const invalid = validateCloudPasswordForm(newPassword, confirmPassword, hint);
      if (invalid) return setFormError(invalid);
    }
    if ((mode === 'change' || mode === 'disable') && !currentPassword) {
      return setFormError('Введите текущий облачный пароль.');
    }
    setFormBusy(true);
    setFormError(null);
    try {
      const status =
        mode === 'disable'
          ? await authService.disableCloudPassword(currentPassword)
          : await authService.setCloudPassword(newPassword, hint.trim(), mode === 'change' ? currentPassword : undefined);
      setTwoFactor(status);
      setNotice(
        mode === 'disable' ? 'Облачный пароль отключён' : mode === 'change' ? 'Облачный пароль изменён' : 'Облачный пароль установлен',
      );
      resetForm();
    } catch (err) {
      setFormError(errorText(err, 'Не удалось сохранить облачный пароль'));
    } finally {
      setFormBusy(false);
    }
  };

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(t);
  }, [notice]);

  const current = sessions?.find((s) => s.current) ?? null;
  const others = sessions?.filter((s) => !s.current) ?? [];

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-label="Конфиденциальность и безопасность">
      <motion.div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={SPRING}
        className="tg-glass relative w-full max-w-md max-h-[88dvh] flex flex-col rounded-3xl overflow-hidden bg-white/90 dark:bg-[#17212b]/90 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-2xl"
      >
        <header className="flex items-center gap-3 px-5 py-4 border-b border-slate-200/70 dark:border-white/[0.06]">
          <IconShieldLock size={22} className="text-[#3390ec] shrink-0" />
          <h2 className="flex-1 text-[16px] font-semibold text-slate-900 dark:text-white">Конфиденциальность и безопасность</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
          >
            <IconX size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto tg-scrollbar px-5 py-4 space-y-6">
          {/* Cloud password */}
          <section aria-labelledby="sec-2fa">
            <h3 id="sec-2fa" className="text-[12px] font-semibold uppercase tracking-wide text-[#3390ec] mb-2">
              Двухэтапная аутентификация
            </h3>
            <div className="rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06] p-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#3390ec]/12 flex items-center justify-center shrink-0">
                  {twoFactor?.enabled ? <IconLock size={20} className="text-[#3390ec]" /> : <IconLockOpen size={20} className="text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-slate-900 dark:text-white">Облачный пароль</div>
                  <div className="text-[12px] text-slate-500 dark:text-slate-400 truncate">
                    {twoFactor === null
                      ? 'Загрузка…'
                      : twoFactor.enabled
                        ? `Включён${twoFactor.hint ? ` · подсказка: ${twoFactor.hint}` : ''}`
                        : 'Выключен — рекомендуем включить'}
                  </div>
                </div>
              </div>

              {mode === 'idle' && twoFactor && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {twoFactor.enabled ? (
                    <>
                      <button type="button" onClick={() => resetForm('change')} className="px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold text-[#3390ec] bg-[#3390ec]/10 hover:bg-[#3390ec]/20 cursor-pointer transition-colors">
                        Сменить пароль
                      </button>
                      <button type="button" onClick={() => resetForm('disable')} className="px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 cursor-pointer transition-colors">
                        Отключить
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => resetForm('set')} className="px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold text-white bg-[#3390ec] hover:bg-[#2b7fd4] cursor-pointer transition-colors">
                      Установить облачный пароль
                    </button>
                  )}
                </div>
              )}

              <AnimatePresence initial={false}>
                {mode !== 'idle' && (
                  <motion.form
                    key={mode}
                    onSubmit={submitPassword}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={SPRING}
                    className="mt-3 space-y-2.5 overflow-hidden"
                  >
                    {(mode === 'change' || mode === 'disable') && (
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Текущий облачный пароль"
                        autoComplete="current-password"
                        aria-label="Текущий облачный пароль"
                        className={inputClass}
                      />
                    )}
                    {mode !== 'disable' && (
                      <>
                        <input
                          type={showPasswords ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Новый пароль"
                          autoComplete="new-password"
                          aria-label="Новый пароль"
                          className={inputClass}
                        />
                        <input
                          type={showPasswords ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Повторите пароль"
                          autoComplete="new-password"
                          aria-label="Повторите пароль"
                          className={inputClass}
                        />
                        <input
                          type="text"
                          value={hint}
                          onChange={(e) => setHint(e.target.value)}
                          placeholder="Подсказка (необязательно)"
                          maxLength={64}
                          aria-label="Подсказка"
                          className={inputClass}
                        />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPasswords((v) => !v)}
                      className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPasswords ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                      {showPasswords ? 'Скрыть' : 'Показать'} пароли
                    </button>
                    {formError && (
                      <p role="alert" className="text-[12px] text-rose-500 font-medium bg-rose-500/10 py-1.5 px-3 rounded-xl">
                        {formError}
                      </p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={formBusy}
                        className={`flex-1 py-2 rounded-full text-[13px] font-semibold text-white cursor-pointer transition-colors disabled:opacity-60 ${
                          mode === 'disable' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-[#3390ec] hover:bg-[#2b7fd4]'
                        }`}
                      >
                        {formBusy ? 'Сохранение…' : mode === 'disable' ? 'Отключить пароль' : 'Сохранить'}
                      </button>
                      <button
                        type="button"
                        onClick={() => resetForm()}
                        className="px-4 py-2 rounded-full text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                      >
                        Отмена
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Active sessions */}
          <section aria-labelledby="sec-sessions">
            <h3 id="sec-sessions" className="text-[12px] font-semibold uppercase tracking-wide text-[#3390ec] mb-2 flex items-center gap-1.5">
              <IconDevices size={14} /> Активные сеансы
            </h3>

            {sessionsError && (
              <p role="alert" className="mb-2 text-[12px] text-rose-500 font-medium bg-rose-500/10 py-1.5 px-3 rounded-xl">
                {sessionsError}
              </p>
            )}

            {sessions === null && !sessionsError && <p className="text-[12.5px] text-slate-400 py-3">Загрузка…</p>}

            {current && <SessionRow session={current} />}

            {others.length > 0 && (
              <>
                {confirmTerminateAll ? (
                  <div className="mt-2 flex items-center gap-2 rounded-2xl bg-rose-500/10 px-3.5 py-2.5">
                    <span className="flex-1 text-[12.5px] text-rose-600 dark:text-rose-400">Завершить все другие сеансы?</span>
                    <button type="button" onClick={terminateOthers} className="px-3 py-1 rounded-full text-[12px] font-semibold text-white bg-rose-500 hover:bg-rose-600 cursor-pointer">
                      Да
                    </button>
                    <button type="button" onClick={() => setConfirmTerminateAll(false)} className="px-3 py-1 rounded-full text-[12px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
                      Нет
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busySessionId !== null}
                    onClick={() => setConfirmTerminateAll(true)}
                    className="mt-2 w-full text-left px-3.5 py-2.5 rounded-2xl text-[13px] font-semibold text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors disabled:opacity-60"
                  >
                    {busySessionId === '*' ? 'Завершение…' : 'Завершить все другие сеансы'}
                  </button>
                )}

                <div className="mt-3 text-[11.5px] font-semibold uppercase tracking-wide text-slate-400">Другие устройства</div>
                <ul className="mt-1.5 space-y-1.5">
                  <AnimatePresence initial={false}>
                    {others.map((s) => (
                      <motion.li key={s.id} layout exit={{ opacity: 0, x: 40 }} transition={SPRING}>
                        <SessionRow
                          session={s}
                          busy={busySessionId === s.id}
                          onTerminate={busySessionId === null ? () => void terminateOne(s.id) : undefined}
                        />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </>
            )}

            {sessions !== null && others.length === 0 && (
              <p className="mt-2 text-[12px] text-slate-400">Других активных сеансов нет.</p>
            )}
          </section>
        </div>

        <AnimatePresence>
          {notice && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={SPRING}
              role="status"
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-slate-900/90 text-white text-[12.5px] shadow-lg"
            >
              {notice}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>,
    document.body,
  );
};

const SessionRow: React.FC<{ session: AuthSessionInfo; busy?: boolean; onTerminate?: () => void }> = ({ session, busy, onTerminate }) => (
  <div className="flex items-center gap-3 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06] px-3.5 py-2.5">
    <span className="text-[22px] leading-none shrink-0" aria-hidden>
      {sessionIcon(session.os)}
    </span>
    <div className="flex-1 min-w-0">
      <div className="text-[13.5px] font-medium text-slate-900 dark:text-white truncate">
        {session.browser} · {session.os}
      </div>
      <div className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate">
        {session.ip} · {session.current ? <span className="text-[#3390ec] font-semibold">этот сеанс</span> : formatLastActive(session.lastActiveAt)}
      </div>
    </div>
    {onTerminate && !session.current && (
      <button
        type="button"
        onClick={onTerminate}
        disabled={busy}
        aria-label="Завершить сеанс"
        title="Завершить сеанс"
        className="p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors disabled:opacity-60"
      >
        <IconX size={16} />
      </button>
    )}
  </div>
);

export default SecuritySettingsModal;
