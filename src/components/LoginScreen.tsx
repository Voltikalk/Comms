import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Smartphone,
  CheckCircle2
} from 'lucide-react';
import { TelegramRegistrationWizard } from './TelegramRegistrationWizard';
import { Skiper26ThemeToggle } from './ui/skiper26';

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

  // Mouse Parallax for Mascot Tilt
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setMouseTilt({
      rx: -(y / 28),
      ry: x / 28,
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
      className="min-h-full h-full overflow-y-auto w-full flex flex-col items-center justify-center p-4 sm:p-6 pt-[max(1.5rem,env(safe-area-inset-top,1.5rem))] pb-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))] auth-canvas text-slate-900 dark:text-white transition-colors duration-300 relative select-none overflow-x-hidden font-body"
    >
      {/* Refined Monochromatic Ambient Glow Orbs */}
      <div className="auth-glow-top pointer-events-none" />
      <div className="auth-glow-bottom pointer-events-none" />

      {/* Top Bar: Skiper 26 Theme Toggle */}
      <div className="fixed top-[max(1rem,env(safe-area-inset-top,1rem))] right-4 z-40 pointer-events-auto">
        {toggleDarkMode && (
          <Skiper26ThemeToggle 
            darkMode={darkMode} 
            toggleDarkMode={toggleDarkMode}
            variant="circle"
            start="top-right"
          />
        )}
      </div>

      {/* Main Centered Container with Double-Bezel (Doppelrand) Architecture */}
      <motion.div 
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] relative z-10"
      >
        <div className="tg-double-bezel-shell">
          <div className="tg-double-bezel-core p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden">
            
            {/* Top specular subtle rim line */}
            <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-white/30 dark:via-white/20 to-transparent pointer-events-none" />

            {/* Interactive 3D Parallax Mascot / Logo with Cerulean Glow */}
            <motion.div
              animate={{
                rotateX: mouseTilt.rx,
                rotateY: mouseTilt.ry,
              }}
              transition={{ type: 'spring', stiffness: 350, damping: 22 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#2B7ECC] to-[#3390EC] text-white flex items-center justify-center shadow-lg shadow-[#3390EC]/30 mb-4 cursor-pointer select-none ring-4 ring-[#3390EC]/15"
            >
              <Send className="w-9 h-9 text-white -translate-x-0.5 translate-y-0.5" />
            </motion.div>

            <h1 className="text-2xl sm:text-[26px] font-bold font-heading text-slate-900 dark:text-white mb-1.5 tracking-tight">
              Вход в Comms
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-6">
              Ультрапремиальный защищенный мессенджер
            </p>

            {/* Segmented Switcher: Вход по паролю vs По QR-коду */}
            <div className="flex p-1 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] w-full mb-6 relative ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
              <button
                type="button"
                onClick={() => setAuthMethod('password')}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 relative z-10 ${
                  authMethod === 'password'
                    ? 'text-[#3390EC] dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {authMethod === 'password' && (
                  <motion.div
                    layoutId="authSegmentActive"
                    className="absolute inset-0 rounded-xl bg-white dark:bg-[#1E2D3D] shadow-xs shadow-black/10 dark:shadow-black/40 ring-1 ring-black/[0.04] dark:ring-white/[0.1] -z-10"
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  />
                )}
                <KeyRound className="w-3.5 h-3.5" />
                <span>По паролю</span>
              </button>

              <button
                type="button"
                onClick={() => setAuthMethod('qr')}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 relative z-10 ${
                  authMethod === 'qr'
                    ? 'text-[#3390EC] dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {authMethod === 'qr' && (
                  <motion.div
                    layoutId="authSegmentActive"
                    className="absolute inset-0 rounded-xl bg-white dark:bg-[#1E2D3D] shadow-xs shadow-black/10 dark:shadow-black/40 ring-1 ring-black/[0.04] dark:ring-white/[0.1] -z-10"
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  />
                )}
                <QrCode className="w-3.5 h-3.5" />
                <span>По QR-коду</span>
              </button>
            </div>

            {/* ================================================================= */}
            {/* MODE 1: PASSWORD LOGIN                                            */}
            {/* ================================================================= */}
            {authMethod === 'password' && (
              <motion.div
                key="method-password"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="w-full"
              >
                {/* Login Form */}
                <form onSubmit={handleLoginSubmit} className="w-full space-y-3.5">
                  <div className="w-full text-left">
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 pl-1">
                      Логин или Email
                    </label>
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => {
                        setLoginIdentifier(e.target.value);
                        setSelectedAccountId(null);
                        setError(null);
                      }}
                      placeholder="vlad или vlad@telegram.org"
                      disabled={isLoading}
                      className="w-full px-4 py-3 rounded-2xl text-[14px] bg-slate-100/80 dark:bg-[#0E1621]/90 border border-slate-200/80 dark:border-white/[0.08] focus:border-[#3390EC] focus:ring-4 focus:ring-[#3390EC]/15 outline-hidden transition-all text-slate-900 dark:text-white placeholder:text-slate-400 shadow-inner"
                    />
                  </div>

                  <div className="w-full text-left relative">
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 pl-1">
                      Пароль
                    </label>
                    <div className="relative">
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          setError(null);
                        }}
                        onKeyUp={handlePasswordKeyUp}
                        placeholder="••••••••"
                        disabled={isLoading}
                        className="w-full pl-4 pr-11 py-3 rounded-2xl text-[14px] bg-slate-100/80 dark:bg-[#0E1621]/90 border border-slate-200/80 dark:border-white/[0.08] focus:border-[#3390EC] focus:ring-4 focus:ring-[#3390EC]/15 outline-hidden transition-all text-slate-900 dark:text-white placeholder:text-slate-400 shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer transition-colors"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Caps Lock Indicator Warning */}
                  {isCapsLockOn && (
                    <div className="text-[11px] text-amber-500 text-left px-1.5 font-medium flex items-center gap-1.5 bg-amber-500/10 py-1 px-2 rounded-lg">
                      <span>⚠️ Caps Lock включен</span>
                    </div>
                  )}

                  {error && (
                    <p className="text-xs text-rose-500 text-left px-1 font-medium bg-rose-500/10 py-1.5 px-3 rounded-xl">
                      {error}
                    </p>
                  )}

                  {/* Island Button with Button-in-Button Architecture */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading || !loginIdentifier.trim()}
                      className={`w-full group tg-island-btn tg-island-btn-primary py-3.5 px-6 rounded-full text-sm font-semibold transition-all ${
                        loginIdentifier.trim()
                          ? 'opacity-100 cursor-pointer'
                          : 'opacity-50 cursor-not-allowed shadow-none'
                      }`}
                    >
                      <span>{isLoading ? 'Выполняется вход...' : 'Войти в Comms'}</span>
                      <div className="tg-btn-inner-icon">
                        <ArrowRight className="w-4 h-4 text-white" />
                      </div>
                    </button>
                  </div>

                  {/* Clean Register Prompt */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setIsRegisterMode(true)}
                      className="w-full py-2.5 px-4 rounded-full text-xs font-semibold text-[#3390EC] dark:text-[#64B5F6] hover:bg-[#3390EC]/10 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Создать новый аккаунт</span>
                    </button>
                  </div>
                </form>

                {/* Collapsible Dev Mode Presets */}
                <div className="w-full mt-5 pt-3.5 border-t border-slate-200/60 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowDevPresets(!showDevPresets)}
                    className="mx-auto text-[11px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1.5 cursor-pointer py-1 px-3 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <span>Тестовые профили для демо</span>
                    <span className="text-[9px]">{showDevPresets ? '▲' : '▼'}</span>
                  </button>

                  <AnimatePresence>
                    {showDevPresets && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-3 overflow-hidden"
                      >
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
                                  ? 'bg-[#3390EC]/15 border-[#3390EC]'
                                  : 'bg-black/[0.02] dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] hover:border-[#3390EC]/50 hover:bg-[#3390EC]/5'
                              }`}
                            >
                              <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${acc.color} text-white flex items-center justify-center text-[11px] font-bold mb-1 shadow-xs`}>
                                {acc.name.charAt(0)}
                              </div>
                              <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate w-full text-center">
                                {acc.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* ================================================================= */}
            {/* MODE 2: TELEGRAM QR CODE LOGIN                                    */}
            {/* ================================================================= */}
            {authMethod === 'qr' && (
              <motion.div
                key="method-qr"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="w-full flex flex-col items-center"
              >
                {/* Precision QR Matrix Shell */}
                <div className="relative p-4 rounded-3xl bg-white dark:bg-[#0E1621] border border-black/[0.08] dark:border-white/[0.08] shadow-lg mb-4">
                  <div className="w-48 h-48 relative flex items-center justify-center bg-white rounded-2xl p-2.5">
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

                    {/* Laser Scanning Line */}
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

                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-4 leading-relaxed">
                  Откройте Telegram на смартфоне: <br />
                  <strong className="text-slate-700 dark:text-slate-300 font-semibold">Настройки → Устройства → Подключить</strong>
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRefreshQr}
                    className="px-4 py-2 rounded-full bg-[#3390EC]/10 hover:bg-[#3390EC]/20 text-[#3390EC] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="tg-tabular">Обновить QR ({qrCodeTimer}с)</span>
                  </button>
                  {isQrRefreshed && (
                    <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Обновлен</span>
                    </span>
                  )}
                </div>

                {/* Quick Demo QR Simulator Button */}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => handleSelectPreset(PRESET_ACCOUNTS[0])}
                    className="text-xs font-medium text-[#3390ec] hover:underline cursor-pointer flex items-center gap-1.5"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Эмулировать сканирование (Влад)</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Security Footer Note */}
            <div className="mt-6 pt-4 border-t border-black/[0.04] dark:border-white/[0.05] w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-[#3390EC]" />
              <span>Comms Web End-to-End Encryption</span>
            </div>

          </div>
        </div>
      </motion.div>

    </div>
  );
};

export default LoginScreen;
