import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import { 
  Sun, 
  Moon, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Send,
  Sparkles
} from 'lucide-react';
import { TelegramRegistrationWizard } from './TelegramRegistrationWizard';

interface LoginScreenProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const PRESET_ACCOUNTS = [
  { id: 'vlad', name: 'Влад', email: 'vlad@telegram.org', pass: 'vladpass', color: 'from-[#3390ec] to-[#0066FF]' },
  { id: 'anya', name: 'Аня', email: 'anya@telegram.org', pass: 'anyapass', color: 'from-[#FF5E62] to-[#FF9966]' },
  { id: 'mom', name: 'Мама', email: 'mom@telegram.org', pass: 'mompass', color: 'from-[#F2994A] to-[#F2C94C]' },
  { id: 'dad', name: 'Папа', email: 'dad@telegram.org', pass: 'dadpass', color: 'from-[#11998e] to-[#38ef7d]' },
  { id: 'sister', name: 'Сестра', email: 'sister@telegram.org', pass: 'sispass', color: 'from-[#8E2DE2] to-[#4A00E0]' }
];

export const LoginScreen: React.FC<LoginScreenProps> = ({ darkMode, toggleDarkMode }) => {
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  
  // Login Form States
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, error: serverError } = useSocket();

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
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-[#0e1621] text-slate-900 dark:text-white transition-colors duration-300 relative select-none">
      
      {/* Top Bar: Theme toggle */}
      <div className="fixed top-4 right-4 z-40 pointer-events-auto">
        {toggleDarkMode && (
          <button
            type="button"
            onClick={toggleDarkMode}
            className="p-2.5 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer flex items-center justify-center active:scale-95 shadow-xs"
            title={darkMode ? 'Светлая тема' : 'Ночной режим'}
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-[#3390ec]" />
            )}
          </button>
        )}
      </div>

      {/* Main Centered Content (Max ~400px) */}
      <motion.div 
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-[400px] flex flex-col items-center text-center"
      >
        
        {/* Telegram Logo / App Icon */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#3390ec] to-[#0072ff] text-white flex items-center justify-center shadow-lg shadow-[#3390ec]/25 mb-6">
          <Send className="w-9 h-9 text-white -translate-x-0.5 translate-y-0.5" />
        </div>

        <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
          Вход в Comms
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-6">
          Введите ваш email или выберите быстрый вход
        </p>

        {/* Quick Demo Accounts */}
        <div className="w-full mb-6">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Быстрый вход:</span>
            <span className="text-[11px] text-[#3390ec] font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Демо-аккаунты
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {PRESET_ACCOUNTS.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => handleSelectPreset(acc)}
                disabled={isLoading}
                className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all duration-200 cursor-pointer ${
                  selectedAccountId === acc.id
                    ? 'bg-[#3390ec]/15 border-[#3390ec] shadow-xs'
                    : 'bg-white dark:bg-[#17212b] border-slate-200 dark:border-white/10 hover:border-[#3390ec]/50 hover:bg-slate-50 dark:hover:bg-[#1d2a3a]'
                }`}
              >
                <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${acc.color} text-white flex items-center justify-center text-xs font-bold shadow-xs mb-1.5`}>
                  {acc.name.charAt(0)}
                </div>
                <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate w-full text-center">
                  {acc.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex py-1 items-center w-full mb-5">
          <div className="grow border-t border-slate-200 dark:border-white/10"></div>
          <span className="shrink mx-3 text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium">или</span>
          <div className="grow border-t border-slate-200 dark:border-white/10"></div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="w-full space-y-3.5">
          <div className="w-full">
            <input
              type="text"
              value={loginIdentifier}
              onChange={(e) => {
                setLoginIdentifier(e.target.value);
                setSelectedAccountId(null);
                setError(null);
              }}
              placeholder="Email или Username"
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
        </form>

        {/* Switch to Registration */}
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setIsRegisterMode(true)}
            className="text-xs font-semibold text-[#3390ec] hover:underline cursor-pointer"
          >
            Нет аккаунта? Зарегистрироваться
          </button>
        </div>

      </motion.div>

    </div>
  );
};

export default LoginScreen;
