import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, LockKeyhole } from 'lucide-react';
import { useAuth } from '../../context/contexts';
import { AuthField } from './AuthField';

/**
 * Second login step for accounts with a cloud password (Telegram «Двухэтапная
 * аутентификация»). The server issued a short-lived challenge after the first
 * password; this screen exchanges it + the cloud password for a session.
 * The heading lives in the parent screen.
 */
export const TwoFactorStep: React.FC = () => {
  const { twoFactor, verifyTwoFactor, cancelTwoFactor, error } = useAuth();
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  if (!twoFactor) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    const ok = await verifyTwoFactor(password);
    setBusy(false);
    if (!ok) {
      setPassword('');
      inputRef.current?.focus();
    }
  };

  const errorText = error
    ? `${error}${typeof twoFactor.remaining === 'number' ? ` · осталось попыток: ${twoFactor.remaining}` : ''}`
    : null;

  return (
    <motion.form
      key="two-factor"
      onSubmit={submit}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="w-full flex flex-col gap-4 text-left"
    >
      <div className="mx-auto mb-2 w-20 h-20 rounded-full bg-[#3390EC]/10 flex items-center justify-center">
        <LockKeyhole className="w-9 h-9 text-[#3390EC]" />
      </div>

      <AuthField
        ref={inputRef}
        label="Облачный пароль"
        type={visible ? 'text' : 'password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        disabled={busy}
        error={errorText}
        hint={twoFactor.hint ? `Подсказка: ${twoFactor.hint}` : undefined}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
          >
            {visible ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
          </button>
        }
      />

      <button
        type="submit"
        disabled={busy || !password}
        className="mt-1 w-full h-[52px] rounded-xl bg-[#3390EC] hover:bg-[#2B83DB] active:bg-[#2475C6] text-white text-[15px] font-semibold tracking-wide uppercase flex items-center justify-center gap-2 transition-[background-color,opacity,transform] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer shadow-[0_6px_16px_-6px_rgba(51,144,236,0.6)]"
      >
        {busy && <Loader2 className="w-[18px] h-[18px] animate-spin" />}
        <span>{busy ? 'Проверка…' : 'Далее'}</span>
      </button>
      <button
        type="button"
        onClick={cancelTwoFactor}
        className="w-full h-11 rounded-xl text-[14px] font-semibold uppercase tracking-wide text-[#3390EC] hover:bg-[#3390EC]/10 cursor-pointer transition-colors"
      >
        Другой аккаунт
      </button>
    </motion.form>
  );
};
