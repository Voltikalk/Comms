import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import { TelegramRegistrationWizard } from './TelegramRegistrationWizard';
import { Skiper26ThemeToggle } from './ui/skiper26';
import { Skiper8 } from './ui/skiper8';
import { TgIcon } from './ui/TgIcon';

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

type AuthTab = 'qr' | 'form';

export const LoginScreen: React.FC<LoginScreenProps> = ({ darkMode, toggleDarkMode }) => {
  const [authTab, setAuthTab] = useState<AuthTab>('qr');
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [showPreloader, setShowPreloader] = useState<boolean>(true);
  
  // Form States
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isCapsLockOn, setIsCapsLockOn] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isPasswordFocused, setIsPasswordFocused] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, error: serverError } = useSocket();
  const formRef = useRef<HTMLFormElement | null>(null);

  // Sync server errors
  useEffect(() => {
    if (serverError) {
      setError(serverError);
    }
  }, [serverError]);

  // Handle Sign In Submit
  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!loginIdentifier.trim()) {
      setError('Введите логин или телефон');
      return;
    }

    if (!loginPassword) {
      setError('Введите пароль');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(loginIdentifier.trim(), loginPassword);
      if (!success && !serverError) {
        setError('Неверный логин или пароль');
      }
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

  // If user selected Registration
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

  return (
    <div className="min-h-full h-full w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-[#ffffff] dark:bg-[#0f0f0f] text-[#000000] dark:text-[#ffffff] relative select-none overflow-x-hidden font-sans transition-colors duration-200">
      
      {/* Skiper UI 08 - Words Preloader */}
      {showPreloader && (
        <Skiper8 onComplete={() => setShowPreloader(false)} />
      )}

      {/* Top Bar: Theme Switcher */}
      <div className="fixed top-4 right-4 z-40">
        {toggleDarkMode && (
          <Skiper26ThemeToggle 
            darkMode={darkMode} 
            toggleDarkMode={toggleDarkMode}
            variant="circle"
            start="top-right"
          />
        )}
      </div>

      {/* Central Authentic Telegram Web Container */}
      <div className="w-full max-w-[440px] flex flex-col items-center text-center relative z-10 py-6">
        
        {/* Telegram Logo Plane */}
        <div className="relative mb-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#3390ec] flex items-center justify-center shadow-lg shadow-[#3390ec]/25 relative">
            <img 
              src="/assets/telegram-logo.svg" 
              alt="Telegram" 
              className="w-14 h-14 sm:w-16 sm:h-16 -translate-x-0.5 translate-y-0.5" 
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {authTab === 'qr' ? (
            /* ==========================================================================
               AUTHENTIC TELEGRAM QR CODE LOGIN MODE
               ========================================================================== */
            <motion.div
              key="tab-qr"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="w-full flex flex-col items-center"
            >
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-2 text-[#000000] dark:text-[#ffffff]">
                Войти в Telegram по QR-коду
              </h1>
              <p className="text-sm text-[#707579] dark:text-[#aaaaaa] mb-6 max-w-xs">
                Быстрый и безопасный вход с мобильного устройства
              </p>

              {/* QR Code Container with Center Plane */}
              <div className="relative w-64 h-64 p-3 bg-white rounded-3xl shadow-sm border border-[#dadce0] dark:border-[#303030] flex items-center justify-center mb-6 overflow-hidden">
                {/* Authentic Simulated Telegram Animated QR SVG */}
                <svg viewBox="0 0 200 200" className="w-full h-full text-black">
                  <rect width="200" height="200" fill="white" />
                  {/* Outer corner squares */}
                  <rect x="15" y="15" width="45" height="45" rx="8" fill="none" stroke="#212121" strokeWidth="8" />
                  <rect x="25" y="25" width="25" height="25" rx="4" fill="#212121" />
                  <rect x="140" y="15" width="45" height="45" rx="8" fill="none" stroke="#212121" strokeWidth="8" />
                  <rect x="150" y="25" width="25" height="25" rx="4" fill="#212121" />
                  <rect x="15" y="140" width="45" height="45" rx="8" fill="none" stroke="#212121" strokeWidth="8" />
                  <rect x="25" y="150" width="25" height="25" rx="4" fill="#212121" />
                  {/* Decorative QR matrix pattern */}
                  <circle cx="80" cy="30" r="5" fill="#212121" />
                  <circle cx="100" cy="30" r="5" fill="#212121" />
                  <circle cx="120" cy="30" r="5" fill="#212121" />
                  <circle cx="80" cy="50" r="5" fill="#212121" />
                  <circle cx="120" cy="50" r="5" fill="#212121" />
                  <circle cx="30" cy="80" r="5" fill="#212121" />
                  <circle cx="50" cy="80" r="5" fill="#212121" />
                  <circle cx="150" cy="80" r="5" fill="#212121" />
                  <circle cx="170" cy="80" r="5" fill="#212121" />
                  <circle cx="30" cy="110" r="5" fill="#212121" />
                  <circle cx="170" cy="110" r="5" fill="#212121" />
                  <circle cx="80" cy="150" r="5" fill="#212121" />
                  <circle cx="100" cy="150" r="5" fill="#212121" />
                  <circle cx="120" cy="150" r="5" fill="#212121" />
                  <circle cx="80" cy="170" r="5" fill="#212121" />
                  <circle cx="120" cy="170" r="5" fill="#212121" />
                  <circle cx="150" cy="150" r="5" fill="#212121" />
                  <circle cx="170" cy="170" r="5" fill="#212121" />
                </svg>

                {/* Laser scan line effect */}
                <motion.div 
                  className="absolute inset-x-3 h-0.5 bg-[#3390ec]/80 shadow-[0_0_8px_#3390ec]"
                  animate={{ top: ['10%', '90%', '10%'] }}
                  transition={{ duration: 2.8, ease: 'easeInOut', repeat: Infinity }}
                />

                {/* Telegram Paper Plane Badge in center */}
                <div className="absolute w-12 h-12 rounded-full bg-[#3390ec] flex items-center justify-center shadow-md ring-4 ring-white">
                  <img src="/assets/telegram-logo.svg" alt="TG" className="w-6 h-6 -translate-x-0.2" />
                </div>
              </div>

              {/* Numbered Steps list matching Telegram Web */}
              <ol className="text-left text-[13px] text-[#707579] dark:text-[#aaaaaa] space-y-2 mb-6 max-w-sm px-4">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#3390ec] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    1
                  </span>
                  <span>Откройте Telegram на своем телефоне</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#3390ec] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Перейдите в <strong className="text-[#000] dark:text-[#fff]">Настройки</strong> &gt; <strong className="text-[#000] dark:text-[#fff]">Устройства</strong> &gt; <strong className="text-[#000] dark:text-[#fff]">Подключить устройство</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#3390ec] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Наведите камеру смартфона на этот экран для подтверждения</span>
                </li>
              </ol>

              {/* Action: Switch to Login by Phone/Password */}
              <button
                type="button"
                onClick={() => setAuthTab('form')}
                className="w-full py-3.5 px-6 rounded-2xl text-sm font-semibold text-[#3390ec] hover:bg-[#3390ec]/10 active:scale-[0.98] transition-all cursor-pointer tracking-wide uppercase"
              >
                ВОЙТИ ПО НОМЕРУ ТЕЛЕФОНА ИЛИ ЛОГИНУ
              </button>
            </motion.div>
          ) : (
            /* ==========================================================================
               AUTHENTIC TELEGRAM FORM LOGIN MODE (PHONE / USERNAME + 2FA)
               ========================================================================== */
            <motion.div
              key="tab-form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="w-full flex flex-col items-center"
            >
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-2 text-[#000000] dark:text-[#ffffff]">
                Вход в аккаунт
              </h1>
              <p className="text-sm text-[#707579] dark:text-[#aaaaaa] mb-6 max-w-xs">
                Пожалуйста, укажите имя пользователя или телефон
              </p>

              {/* Interactive 2FA Monkey Reaction Avatar */}
              <div className="w-16 h-16 rounded-full bg-[#3390ec]/10 flex items-center justify-center mb-4 text-3xl select-none transition-transform duration-200">
                {isPasswordFocused ? (showLoginPassword ? '🙈' : '🐵') : '🐵'}
              </div>

              <form ref={formRef} onSubmit={handleLoginSubmit} className="w-full space-y-4">
                
                {/* Floating-Label Identifier Input */}
                <div className="relative text-left">
                  <input
                    type="text"
                    id="tg-identifier"
                    value={loginIdentifier}
                    onChange={(e) => {
                      setLoginIdentifier(e.target.value);
                      setSelectedAccountId(null);
                      setError(null);
                    }}
                    disabled={isLoading}
                    placeholder=" "
                    className="peer w-full h-12 px-4 pt-4 pb-1 rounded-xl text-sm bg-transparent border border-[#dadce0] dark:border-[#303030] focus:border-[#3390ec] dark:focus:border-[#3390ec] outline-hidden text-[#000] dark:text-[#fff] transition-colors"
                  />
                  <label
                    htmlFor="tg-identifier"
                    className="absolute left-4 top-3 text-[#707579] dark:text-[#aaaaaa] text-sm pointer-events-none transition-all duration-150 origin-left peer-focus:-translate-y-2.5 peer-focus:scale-75 peer-focus:text-[#3390ec] peer-[:not(:placeholder-shown)]:-translate-y-2.5 peer-[:not(:placeholder-shown)]:scale-75"
                  >
                    Логин, телефон или Email
                  </label>
                </div>

                {/* Floating-Label Password Input with Monkey Tracker */}
                <div className="relative text-left">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    id="tg-password"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setError(null);
                    }}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    onKeyUp={handlePasswordKeyUp}
                    disabled={isLoading}
                    placeholder=" "
                    className="peer w-full h-12 pl-4 pr-11 pt-4 pb-1 rounded-xl text-sm bg-transparent border border-[#dadce0] dark:border-[#303030] focus:border-[#3390ec] dark:focus:border-[#3390ec] outline-hidden text-[#000] dark:text-[#fff] transition-colors"
                  />
                  <label
                    htmlFor="tg-password"
                    className="absolute left-4 top-3 text-[#707579] dark:text-[#aaaaaa] text-sm pointer-events-none transition-all duration-150 origin-left peer-focus:-translate-y-2.5 peer-focus:scale-75 peer-focus:text-[#3390ec] peer-[:not(:placeholder-shown)]:-translate-y-2.5 peer-[:not(:placeholder-shown)]:scale-75"
                  >
                    Пароль аккаунта
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#707579] hover:text-[#3390ec] p-1.5 cursor-pointer transition-colors"
                    title={showLoginPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    <TgIcon name={showLoginPassword ? 'eye-crossed' : 'eye'} className="text-lg" />
                  </button>
                </div>

                {/* Caps Lock Indicator */}
                {isCapsLockOn && (
                  <div className="text-[12px] text-amber-600 dark:text-amber-400 text-left px-2 font-medium">
                    ⚠️ Включен Caps Lock
                  </div>
                )}

                {/* Keep Me Signed In Checkbox */}
                <div className="flex items-center gap-2.5 px-1 py-1 text-left cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${rememberMe ? 'bg-[#3390ec] border-[#3390ec] text-white' : 'border-[#dadce0] dark:border-[#5b5b5a]'}`}>
                    {rememberMe && <TgIcon name="check" className="text-xs" />}
                  </div>
                  <span className="text-[13px] text-[#707579] dark:text-[#aaaaaa]">
                    Запомнить меня
                  </span>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="text-xs text-[#e53935] bg-[#e53935]/10 py-2 px-3 rounded-xl text-left font-medium">
                    {error}
                  </div>
                )}

                {/* Telegram Primary Button */}
                <button
                  type="submit"
                  disabled={isLoading || !loginIdentifier.trim()}
                  className="w-full h-12 rounded-2xl bg-[#3390ec] hover:bg-[#2f84d9] active:scale-[0.98] text-white text-sm font-semibold tracking-wide uppercase transition-all shadow-md shadow-[#3390ec]/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <span>ВХОД...</span>
                  ) : (
                    <>
                      <span>ДАЛЕЕ</span>
                      <TgIcon name="arrow-right" className="text-base" />
                    </>
                  )}
                </button>

                {/* Back to QR code */}
                <button
                  type="button"
                  onClick={() => setAuthTab('qr')}
                  className="w-full py-2.5 text-xs font-semibold text-[#3390ec] hover:underline cursor-pointer uppercase tracking-wider"
                >
                  ВХОД ПО QR-КОДУ
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Demo Fast Account Switcher */}
        <div className="w-full mt-6 pt-4 border-t border-[#dadce0]/50 dark:border-[#303030]/60">
          <p className="text-[11px] text-[#707579] dark:text-[#aaaaaa] mb-2.5">
            Быстрый вход для тестирования (1 клик):
          </p>
          <div className="grid grid-cols-5 gap-2">
            {PRESET_ACCOUNTS.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => handleSelectPreset(acc)}
                disabled={isLoading}
                title={`${acc.name} — ${acc.status}`}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                  selectedAccountId === acc.id
                    ? 'bg-[#3390ec]/15 border-[#3390ec]'
                    : 'bg-black/[0.02] dark:bg-white/[0.03] border-transparent hover:border-[#3390ec]/40 hover:bg-[#3390ec]/5'
                }`}
              >
                <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${acc.color} text-white flex items-center justify-center text-xs font-bold mb-1 shadow-xs`}>
                  {acc.name.charAt(0)}
                </div>
                <span className="text-[11px] font-medium text-[#000] dark:text-[#fff] truncate w-full text-center">
                  {acc.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Registration Prompt */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setIsRegisterMode(true)}
            className="text-xs font-semibold text-[#3390ec] hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto"
          >
            <TgIcon name="add-user" className="text-sm" />
            <span>Создать новый аккаунт</span>
          </button>
        </div>

      </div>

    </div>
  );
};

export default LoginScreen;
