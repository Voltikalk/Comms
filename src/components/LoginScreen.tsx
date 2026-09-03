import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import { 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Send, 
  Sparkles, 
  QrCode, 
  KeyRound, 
  RefreshCw,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { TelegramRegistrationWizard } from './TelegramRegistrationWizard';
import { Skiper26ThemeToggle } from './ui/skiper26';

interface LoginScreenProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const PRESET_ACCOUNTS = [
  { id: 'vlad', name: 'Влад', email: 'vlad@telegram.org', pass: 'vladpass', color: 'from-[#3390ec] to-[#0066FF]', status: '⚡ Всегда на связи' },
  { id: 'anya', name: 'Аня', email: 'anya@telegram.org', pass: 'anyapass', color: 'from-[#FF5E62] to-[#FF9966]', status: '❤️ В сети' },
  { id: 'mom', name: 'Мама', email: 'mom@telegram.org', pass: 'mompass', color: 'from-[#F2994A] to-[#F2C94C]', status: '🌸 Дома' },
  { id: 'dad', name: 'Папа', email: 'dad@telegram.org', pass: 'dadpass', color: 'from-[#11998e] to-[#38ef7d]', status: '🔧 На работе' },
  { id: 'sister', name: 'Сестра', email: 'sister@telegram.org', pass: 'sispass', color: 'from-[#8E2DE2] to-[#4A00E0]', status: '✨ Слушает музыку' }
];

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

  // 3D Tilt effect on Mascot
  const [mouseTilt, setMouseTilt] = useState<{ rx: number; ry: number }>({ rx: 0, ry: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, error: serverError } = useSocket();

  // QR Code Countdown
  useEffect(() => {
    let timer: any = null;
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

  // Mouse Parallax for Mascot Tilt
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setMouseTilt({
      rx: -(y / 25),
      ry: x / 25,
    });
  };

  const handleMouseLeave = () => {
    setMouseTilt({ rx: 0, ry: 0 });
  };

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

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-[#0e1621] text-slate-900 dark:text-white transition-colors duration-300 relative select-none overflow-x-hidden"
    >
      
      {/* Soft Ambient Light Orbs */}
      <div className="absolute top-1/4 -right-20 w-80 h-80 rounded-full bg-[#3390ec]/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-80 h-80 rounded-full bg-[#0066FF]/10 blur-[100px] pointer-events-none" />

      {/* Top Bar: Skiper 26 Theme Toggle */}
      <div className="fixed top-4 right-4 z-40 pointer-events-auto">
        {toggleDarkMode && (
          <Skiper26ThemeToggle 
            darkMode={darkMode} 
            toggleDarkMode={toggleDarkMode}
            variant="circle"
            start="top-right"
          />
        )}
      </div>

      {/* Main Centered Container (Max ~400px) */}
      <motion.div 
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-[400px] flex flex-col items-center text-center relative z-10"
      >
        
        {/* Interactive 3D Parallax Mascot / Logo */}
        <motion.div
          animate={{
            rotateX: mouseTilt.rx,
            rotateY: mouseTilt.ry,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#3390ec] to-[#0072ff] text-white flex items-center justify-center shadow-lg shadow-[#3390ec]/25 mb-5 cursor-pointer select-none"
        >
          <Send className="w-9 h-9 text-white -translate-x-0.5 translate-y-0.5" />
        </motion.div>

        <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 dark:text-white mb-1.5 tracking-tight">
          Вход в Comms
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-5">
          Защищенный мессенджер нового поколения
        </p>

        {/* Tab Switcher: Вход по паролю vs По QR-коду */}
        <div className="flex p-1 rounded-2xl bg-slate-200/70 dark:bg-white/10 w-full mb-6 relative">
          <button
            type="button"
            onClick={() => setAuthMethod('password')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 relative z-10 ${
              authMethod === 'password'
                ? 'bg-white dark:bg-[#17212b] text-[#3390ec] dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Вход по паролю</span>
          </button>

          <button
            type="button"
            onClick={() => setAuthMethod('qr')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 relative z-10 ${
              authMethod === 'qr'
                ? 'bg-white dark:bg-[#17212b] text-[#3390ec] dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>По QR-коду</span>
          </button>
        </div>

        {/* ================================================================= */}
        {/* MODE 1: PASSWORD LOGIN & CLEAN TELEGRAM AUTH                       */}
        {/* ================================================================= */}
        {authMethod === 'password' && (
          <motion.div
            key="method-password"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="w-full space-y-3">
              <div className="w-full">
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => {
                    setLoginIdentifier(e.target.value);
                    setSelectedAccountId(null);
                    setError(null);
                  }}
                  placeholder="Email или @username"
                  disabled={isLoading}
                  className="w-full px-4 py-3.5 rounded-2xl text-base bg-white dark:bg-[#17212b] border border-slate-200 dark:border-white/10 focus:border-[#3390ec] focus:ring-4 focus:ring-[#3390ec]/15 outline-hidden transition-all text-slate-900 dark:text-white placeholder:text-slate-400 shadow-xs"
                />
              </div>

              <div className="relative w-full">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setError(null);
                  }}
                  onKeyUp={handlePasswordKeyUp}
                  placeholder="Пароль"
                  disabled={isLoading}
                  className="w-full pl-4 pr-11 py-3.5 rounded-2xl text-base bg-white dark:bg-[#17212b] border border-slate-200 dark:border-white/10 focus:border-[#3390ec] focus:ring-4 focus:ring-[#3390ec]/15 outline-hidden transition-all text-slate-900 dark:text-white placeholder:text-slate-400 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Caps Lock Indicator Warning */}
              {isCapsLockOn && (
                <div className="text-[11px] text-amber-500 text-left px-1 font-medium flex items-center gap-1">
                  <span>⚠️ Caps Lock включен</span>
                </div>
              )}

              {error && (
                <p className="text-xs text-rose-500 text-left px-1 font-medium">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading || !loginIdentifier.trim()}
                className={`w-full py-3.5 px-6 rounded-2xl text-base font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                  loginIdentifier.trim()
                    ? 'bg-[#3390ec] hover:bg-[#2b7ac9] active:bg-[#2469ab] text-white shadow-[#3390ec]/25 active:scale-[0.99]'
                    : 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-70 shadow-none'
                }`}
              >
                {isLoading ? (
                  <span>Вход...</span>
                ) : (
                  <>
                    <span>Войти</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Prominent Create Account button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(true)}
                  className="w-full py-3 px-4 rounded-2xl text-xs font-bold text-[#3390ec] dark:text-[#64b5f6] bg-[#3390ec]/10 hover:bg-[#3390ec]/15 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Создать новый аккаунт</span>
                </button>
              </div>
            </form>

            {/* Collapsible Dev Mode Presets */}
            <div className="w-full mt-6 pt-4 border-t border-slate-200/60 dark:border-white/5">
              <button
                type="button"
                onClick={() => setShowDevPresets(!showDevPresets)}
                className="mx-auto text-[11px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1.5 cursor-pointer py-1 px-3 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <span>🧪 Тестовые профили (Dev Mode)</span>
                <span className="text-[9px]">{showDevPresets ? '▲' : '▼'}</span>
              </button>

              {showDevPresets && (
                <div className="mt-3">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2">
                    Быстрый вход для тестирования функций:
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {PRESET_ACCOUNTS.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => handleSelectPreset(acc)}
                        disabled={isLoading}
                        title={`${acc.name} — ${acc.status}`}
                        className={`flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all cursor-pointer ${
                          selectedAccountId === acc.id
                            ? 'bg-[#3390ec]/15 border-[#3390ec]'
                            : 'bg-white dark:bg-[#17212b] border-slate-200 dark:border-white/10 hover:border-[#3390ec]/50 hover:bg-slate-50 dark:hover:bg-[#1d2a3a]'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${acc.color} text-white flex items-center justify-center text-[11px] font-bold mb-1 shadow-xs`}>
                          {acc.name.charAt(0)}
                        </div>
                        <span className="text-[10px] font-medium text-slate-800 dark:text-slate-200 truncate w-full text-center">
                          {acc.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ================================================================= */}
        {/* MODE 2: TELEGRAM QR CODE LOGIN                                    */}
        {/* ================================================================= */}
        {authMethod === 'qr' && (
          <motion.div
            key="method-qr"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full flex flex-col items-center"
          >
            {/* Interactive SVG QR Code with Scanning Beam */}
            <div className="relative p-5 rounded-3xl bg-white dark:bg-[#17212b] border border-slate-200 dark:border-white/10 shadow-xl mb-4">
              <div className="w-48 h-48 relative flex items-center justify-center bg-white rounded-2xl p-2">
                {/* Stylized QR Code Matrix */}
                <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900">
                  {/* Outer corner anchors */}
                  <rect x="5" y="5" width="25" height="25" fill="none" stroke="#17212b" strokeWidth="4" rx="4" />
                  <rect x="11" y="11" width="13" height="13" fill="#3390ec" rx="2" />
                  <rect x="70" y="5" width="25" height="25" fill="none" stroke="#17212b" strokeWidth="4" rx="4" />
                  <rect x="76" y="11" width="13" height="13" fill="#3390ec" rx="2" />
                  <rect x="5" y="70" width="25" height="25" fill="none" stroke="#17212b" strokeWidth="4" rx="4" />
                  <rect x="11" y="76" width="13" height="13" fill="#3390ec" rx="2" />
                  
                  {/* Decorative QR points */}
                  <rect x="35" y="10" width="6" height="6" fill="#17212b" />
                  <rect x="45" y="10" width="6" height="6" fill="#17212b" />
                  <rect x="55" y="10" width="6" height="6" fill="#17212b" />
                  <rect x="35" y="22" width="6" height="6" fill="#17212b" />
                  <rect x="50" y="25" width="6" height="6" fill="#17212b" />
                  
                  <rect x="10" y="38" width="6" height="6" fill="#17212b" />
                  <rect x="22" y="42" width="6" height="6" fill="#17212b" />
                  <rect x="35" y="40" width="8" height="8" fill="#3390ec" />
                  <rect x="65" y="38" width="6" height="6" fill="#17212b" />
                  <rect x="80" y="42" width="6" height="6" fill="#17212b" />

                  <rect x="38" y="60" width="6" height="6" fill="#17212b" />
                  <rect x="48" y="65" width="8" height="8" fill="#17212b" />
                  <rect x="62" y="60" width="6" height="6" fill="#17212b" />
                  <rect x="75" y="72" width="6" height="6" fill="#17212b" />
                  <rect x="85" y="80" width="8" height="8" fill="#3390ec" />
                </svg>

                {/* Center Telegram Logo Badge */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full bg-[#3390ec] text-white flex items-center justify-center shadow-md border-2 border-white">
                    <Send className="w-5 h-5 -translate-x-0.5 translate-y-0.5 text-white" />
                  </div>
                </div>

                {/* Animated Laser Scanning Line */}
                <motion.div
                  animate={{
                    y: [-80, 80, -80],
                    opacity: [0.3, 0.9, 0.3],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="absolute w-44 h-0.5 bg-gradient-to-r from-transparent via-[#3390ec] to-transparent shadow-[0_0_8px_#3390ec]"
                />
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-4">
              Откройте Telegram на телефоне: <br />
              <strong className="text-slate-700 dark:text-slate-300">Настройки → Устройства → Подключить</strong>
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefreshQr}
                className="px-3.5 py-1.5 rounded-full bg-[#3390ec]/10 hover:bg-[#3390ec]/20 text-[#3390ec] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Обновить QR-код ({qrCodeTimer}с)</span>
              </button>
              {isQrRefreshed && (
                <span className="text-xs text-emerald-500 font-medium">Обновлен!</span>
              )}
            </div>

            {/* Quick Demo QR Simulator Button */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => handleSelectPreset(PRESET_ACCOUNTS[0])}
                className="text-xs font-medium text-[#3390ec] hover:underline cursor-pointer flex items-center gap-1"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Эмулировать сканирование (Влад)</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Switch to Registration (for QR mode) */}
        {authMethod === 'qr' && (
          <div className="mt-7">
            <button
              type="button"
              onClick={() => setIsRegisterMode(true)}
              className="text-xs font-semibold text-[#3390ec] hover:underline cursor-pointer"
            >
              Нет аккаунта? Зарегистрироваться
            </button>
          </div>
        )}

        {/* Security Footer Note */}
        <div className="mt-6 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-[#3390ec]" />
          <span>Comms Web End-to-End Encryption</span>
        </div>

      </motion.div>

    </div>
  );
};

export default LoginScreen;
