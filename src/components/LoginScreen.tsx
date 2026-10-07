import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/contexts';
import { Eye, EyeOff, QrCode, KeyRound, RefreshCw, Send, Smartphone, CheckCircle2, ChevronDown, Loader2 } from 'lucide-react';
import { TelegramRegistrationWizard } from './TelegramRegistrationWizard';
import { TwoFactorStep } from './Auth/TwoFactorStep';
import { AuthLayout } from './Auth/AuthLayout';
import { AuthField } from './Auth/AuthField';

interface LoginScreenProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const PRESET_ACCOUNTS = [
  { id: 'vlad', name: 'Влад', email: 'vlad@telegram.org', pass: 'vladpass', color: 'from-[#3390EC] to-[#2B7ECC]', status: '⚡ Всегда на связи' },
  { id: 'anya', name: 'Аня', email: 'anya@telegram.org', pass: 'anyapass', color: 'from-[#FF5E62] to-[#FF9966]', status: '❤️ В сети' },
  { id: 'mom', name: 'Мама', email: 'mom@telegram.org', pass: 'mompass', color: 'from-[#F2994A] to-[#F2C94C]', status: '🌸 Дома' },
  { id: 'dad', name: 'Папа', email: 'dad@telegram.org', pass: 'dadpass', color: 'from-[#10B981] to-[#059669]', status: '🔧 На работе' },
  { id: 'sister', name: 'Сестра', email: 'sister@telegram.org', pass: 'sispass', color: 'from-[#8B5CF6] to-[#6D28D9]', status: '✨ Слушает музыку' }
];

const EASE = [0.16, 1, 0.3, 1] as const;

const QR_STEPS = [
  'Откройте Comms на телефоне',
  'Перейдите в Настройки → Устройства',
  'Нажмите «Подключить устройство» и наведите камеру',
] as const;

/** Decorative QR matrix with the brand badge and a scanning line. */
const QrMatrix: React.FC<{ expired: boolean }> = ({ expired }) => (
  <div className="relative w-[200px] h-[200px] rounded-[20px] bg-white p-3 ring-1 ring-black/[0.08] dark:ring-white/10 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.25)]">
    <svg viewBox="0 0 100 100" className={`w-full h-full transition-[filter,opacity] duration-300 ${expired ? 'blur-[3px] opacity-40' : ''}`}>
      {[
        [5, 5],
        [70, 5],
        [5, 70],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="25" height="25" fill="none" stroke="#17212b" strokeWidth="4" rx="6" />
          <rect x={x + 7} y={y + 7} width="11" height="11" fill="#2481CC" rx="3" />
        </g>
      ))}
      {[
        [36, 8], [46, 8], [56, 14], [36, 20], [50, 24], [8, 38], [20, 42], [62, 38], [80, 42], [90, 36],
        [38, 60], [62, 60], [74, 72], [86, 66], [40, 84], [54, 88], [66, 82], [84, 86], [12, 54], [26, 58],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="6" height="6" rx="1.5" fill="#17212b" />
      ))}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-12 h-12 rounded-full bg-[linear-gradient(135deg,#37AEE2,#1E96C8)] text-white flex items-center justify-center ring-4 ring-white">
        <Send className="w-5 h-5 -translate-x-px translate-y-px" />
      </div>
    </div>
    {!expired && (
      <motion.div
        aria-hidden
        animate={{ top: ['8%', '92%', '8%'] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-4 right-4 h-0.5 rounded-full bg-gradient-to-r from-transparent via-[#3390EC] to-transparent shadow-[0_0_10px_#3390EC]"
      />
    )}
  </div>
);

export const LoginScreen: React.FC<LoginScreenProps> = ({ darkMode, toggleDarkMode }) => {
  const [authMethod, setAuthMethod] = useState<'password' | 'qr'>('password');
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);

  // Login Form States
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isCapsLockOn, setIsCapsLockOn] = useState<boolean>(false);
  const [showDevPresets, setShowDevPresets] = useState<boolean>(false);

  // QR Code States
  const [qrCodeTimer, setQrCodeTimer] = useState<number>(60);
  const [isQrRefreshed, setIsQrRefreshed] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, error: serverError, twoFactor } = useAuth();

  // QR Code Countdown
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (authMethod === 'qr' && qrCodeTimer > 0) {
      timer = setInterval(() => {
        setQrCodeTimer((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [authMethod, qrCodeTimer]);

  // Sync server errors
  useEffect(() => {
    if (serverError) {
      setError(serverError);
    }
  }, [serverError]);

  // Handle Sign In Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loginIdentifier.trim()) {
      setError('Введите Email или Username');
      return;
    }

    if (!loginPassword) {
      setError('Введите пароль');
      return;
    }

    setIsLoading(true);
    try {
      // Failures surface through the auth context error; `false` without an
      // error means the cloud-password (2FA) step is now shown.
      await login(loginIdentifier.trim(), loginPassword);
    } catch (err: any) {
      setError(err?.message || 'Ошибка входа');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Preset Account Click
  const handleSelectPreset = async (account: typeof PRESET_ACCOUNTS[0]) => {
    setSelectedAccountId(account.id);
    setLoginIdentifier(account.id);
    setLoginPassword(account.pass);
    setError(null);

    setIsLoading(true);
    try {
      await login(account.id, account.pass);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Caps Lock
  const handlePasswordKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setIsCapsLockOn(e.getModifierState('CapsLock'));
  };

  const handleRefreshQr = () => {
    setQrCodeTimer(60);
    setIsQrRefreshed(true);
    setTimeout(() => setIsQrRefreshed(false), 2000);
  };

  // If user selected Registration, display the dedicated multi-step Telegram Registration Wizard
  if (isRegisterMode) {
    return (
      <TelegramRegistrationWizard
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        onCancel={() => {
          setIsRegisterMode(false);
          setError(null);
        }}
      />
    );
  }

  const canSubmit = !!loginIdentifier.trim() && !isLoading;

  return (
    <AuthLayout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="w-full flex flex-col items-center text-center"
      >
        <h1 className="text-[26px] sm:text-[28px] font-heading font-bold tracking-tight">
          {twoFactor ? 'Облачный пароль' : authMethod === 'qr' ? 'Вход по QR-коду' : 'Вход в аккаунт'}
        </h1>
        <p className="mt-1.5 text-[14.5px] text-slate-500 dark:text-slate-400 max-w-[320px] leading-snug">
          {twoFactor
            ? 'Для аккаунта включена двухэтапная аутентификация. Введите дополнительный пароль.'
            : authMethod === 'qr'
              ? 'Отсканируйте код телефоном, на котором вы уже вошли'
              : 'Введите логин или email и пароль от Comms'}
        </p>

        {/* Segmented switcher */}
        {!twoFactor && (
          <div role="tablist" aria-label="Способ входа" className="mt-7 mb-6 w-full grid grid-cols-2 p-1 rounded-full bg-slate-100 dark:bg-[#0E1621]">
            {(
              [
                { id: 'password', label: 'Пароль', icon: KeyRound },
                { id: 'qr', label: 'QR-код', icon: QrCode },
              ] as const
            ).map(({ id, label, icon: Icon }) => {
              const active = authMethod === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setAuthMethod(id)}
                  className={`relative h-9 rounded-full text-[13.5px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    active ? 'text-[#2481CC] dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="authSegmentActive"
                      className="absolute inset-0 rounded-full bg-white dark:bg-[#2B5278] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                  <Icon className="relative w-4 h-4" />
                  <span className="relative">{label}</span>
                </button>
              );
            })}
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          {authMethod === 'password' ? (
            <motion.div
              key="method-password"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="w-full"
            >
              {twoFactor ? (
                <div className="mt-6">
                  <TwoFactorStep />
                </div>
              ) : (
                <>
                  <form onSubmit={handleLoginSubmit} noValidate className="w-full flex flex-col gap-4">
                    <AuthField
                      label="Логин или email"
                      type="text"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={loginIdentifier}
                      onChange={(e) => {
                        setLoginIdentifier(e.target.value);
                        setSelectedAccountId(null);
                        setError(null);
                      }}
                      disabled={isLoading}
                    />

                    <AuthField
                      label="Пароль"
                      type={showLoginPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        setError(null);
                      }}
                      onKeyUp={handlePasswordKeyUp}
                      disabled={isLoading}
                      error={error}
                      trailing={
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          aria-label={showLoginPassword ? 'Скрыть пароль' : 'Показать пароль'}
                          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                        >
                          {showLoginPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                        </button>
                      }
                    />

                    <AnimatePresence>
                      {isCapsLockOn && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="-mt-2 px-1 text-left text-[12.5px] font-medium text-amber-600 dark:text-amber-400"
                        >
                          Включён Caps Lock
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="mt-1 w-full h-[52px] rounded-xl bg-[#3390EC] hover:bg-[#2B83DB] active:bg-[#2475C6] text-white text-[15px] font-semibold tracking-wide uppercase flex items-center justify-center gap-2 transition-[background-color,opacity,transform] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer shadow-[0_6px_16px_-6px_rgba(51,144,236,0.6)]"
                    >
                      {isLoading && <Loader2 className="w-[18px] h-[18px] animate-spin" />}
                      <span>{isLoading ? 'Вход…' : 'Далее'}</span>
                    </button>
                  </form>

                  <p className="mt-6 text-[14px] text-slate-500 dark:text-slate-400">
                    Нет аккаунта?{' '}
                    <button
                      type="button"
                      onClick={() => setIsRegisterMode(true)}
                      className="font-semibold text-[#3390EC] hover:underline underline-offset-2 cursor-pointer"
                    >
                      Создать
                    </button>
                  </p>

                  {/* Dev presets */}
                  <div className="mt-6 pt-4 border-t border-slate-200/80 dark:border-white/[0.07]">
                    <button
                      type="button"
                      onClick={() => setShowDevPresets(!showDevPresets)}
                      aria-expanded={showDevPresets}
                      className="mx-auto flex items-center gap-1 py-1 px-3 rounded-full text-[12.5px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <span>Тестовые профили</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDevPresets ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence initial={false}>
                      {showDevPresets && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-3 flex justify-center gap-3">
                            {PRESET_ACCOUNTS.map((acc) => (
                              <button
                                key={acc.id}
                                type="button"
                                onClick={() => handleSelectPreset(acc)}
                                disabled={isLoading}
                                title={`${acc.name} — ${acc.status}`}
                                className="group w-14 flex flex-col items-center gap-1 cursor-pointer disabled:cursor-wait"
                              >
                                <span
                                  className={`w-11 h-11 rounded-full bg-gradient-to-tr ${acc.color} text-white flex items-center justify-center text-[15px] font-semibold transition-[transform,box-shadow] group-hover:scale-105 ${
                                    selectedAccountId === acc.id
                                      ? 'ring-2 ring-[#3390EC] ring-offset-2 ring-offset-white dark:ring-offset-[#17212B]'
                                      : ''
                                  }`}
                                >
                                  {acc.name.charAt(0)}
                                </span>
                                <span className="w-full truncate text-[11.5px] text-slate-600 dark:text-slate-300">{acc.name}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="method-qr"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="w-full flex flex-col items-center"
            >
              <div className="relative">
                <QrMatrix expired={qrCodeTimer === 0} />
                {qrCodeTimer === 0 && (
                  <button
                    type="button"
                    onClick={handleRefreshQr}
                    className="absolute inset-0 m-auto w-fit h-fit px-4 py-2 rounded-full bg-[#3390EC] text-white text-[13px] font-semibold flex items-center gap-1.5 shadow-lg cursor-pointer active:scale-95"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Обновить код
                  </button>
                )}
              </div>

              <ol className="mt-6 w-full flex flex-col gap-3 text-left">
                {QR_STEPS.map((step, i) => (
                  <li key={step} className="flex items-center gap-3 text-[14px] text-slate-700 dark:text-slate-300">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-[#3390EC] text-white text-[12.5px] font-semibold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-5 flex items-center gap-3 text-[13px]">
                {qrCodeTimer > 0 && (
                  <button
                    type="button"
                    onClick={handleRefreshQr}
                    className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-[#3390EC] cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="tg-tabular">Код обновится через {qrCodeTimer} с</span>
                  </button>
                )}
                {isQrRefreshed && (
                  <span className="flex items-center gap-1 font-medium text-emerald-500">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Обновлён
                  </span>
                )}
              </div>

              <div className="mt-6 w-full flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setAuthMethod('password')}
                  className="w-full h-11 rounded-xl text-[14px] font-semibold uppercase tracking-wide text-[#3390EC] hover:bg-[#3390EC]/10 cursor-pointer transition-colors"
                >
                  Войти по паролю
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(PRESET_ACCOUNTS[0])}
                  disabled={isLoading}
                  className="mx-auto flex items-center gap-1.5 py-1 text-[12.5px] text-slate-400 dark:text-slate-500 hover:text-[#3390EC] cursor-pointer transition-colors"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Эмулировать сканирование (демо)
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AuthLayout>
  );
};

export default LoginScreen;
