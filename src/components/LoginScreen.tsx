import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import { 
  Sun, 
  Moon, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ArrowRight, 
  LogIn, 
  UserPlus,
  KeyRound
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { usePageTransition } from './animations/usePageTransition';
import { 
  GradientBackground, 
  AnimatedBorder, 
  AnimatedLockIcon, 
  AnimatedErrorIcon 
} from './effects';
import { useFormValidation } from './interactions/useFormValidation';
import { useToggleAnimation } from './interactions/useToggleAnimation';
import { useResponsive } from '../hooks/useMediaQuery';
import { TelegramRegistrationWizard } from './TelegramRegistrationWizard';

interface LoginScreenProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const PRESET_ACCOUNTS = [
  { id: 'vlad', name: 'Влад', email: 'vlad@telegram.org', pass: 'vladpass', color: 'from-[#0066FF] to-[#3385FF]' },
  { id: 'anya', name: 'Аня', email: 'anya@telegram.org', pass: 'anyapass', color: 'from-[#FF3385] to-[#FF66AA]' },
  { id: 'mom', name: 'Мама', email: 'mom@telegram.org', pass: 'mompass', color: 'from-[#FF9900] to-[#FFB733]' },
  { id: 'dad', name: 'Папа', email: 'dad@telegram.org', pass: 'dadpass', color: 'from-[#00C2FF] to-[#33D6FF]' },
  { id: 'sister', name: 'Сестра', email: 'sister@telegram.org', pass: 'sispass', color: 'from-[#00D084] to-[#33E0A0]' }
];

export const LoginScreen: React.FC<LoginScreenProps> = ({ darkMode, toggleDarkMode }) => {
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  
  // Login Form States
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { login, error: serverError } = useSocket();
  const { globalError, setError, clearError, errorBannerVariants } = useFormValidation();
  const { eyeIconVariants } = useToggleAnimation();
  const { cardVariants } = usePageTransition();
  const { isMobile, prefersReducedMotion } = useResponsive();

  // Sync server errors into validation auto-hide state
  useEffect(() => {
    if (serverError) {
      setError(serverError);
    }
  }, [serverError, setError]);

  // Handle Sign In Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!loginIdentifier.trim()) {
      setError('Введите Email, Username или ключ доступа.');
      return;
    }

    if (!loginPassword) {
      setError('Введите пароль.');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(loginIdentifier.trim(), loginPassword);

      if (success) {
        setIsSuccess(true);
      } else {
        if (!serverError) {
          setError('Неверный логин или пароль.');
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Preset Account Click
  const handleSelectPreset = async (account: typeof PRESET_ACCOUNTS[0]) => {
    setSelectedAccountId(account.id);
    setLoginIdentifier(account.id);
    setLoginPassword(account.pass);
    clearError();

    setIsLoading(true);
    try {
      const success = await login(account.id, account.pass);
      if (success) {
        setIsSuccess(true);
      }
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
          clearError();
        }}
      />
    );
  }

  return (
    <GradientBackground showParticles={!prefersReducedMotion}>
      
      {/* Fixed Top-Right Theme Toggle Control */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 pointer-events-auto"
      >
        <button
          type="button"
          onClick={toggleDarkMode}
          className="min-h-[44px] min-w-[44px] p-2.5 sm:p-3 rounded-[14px] bg-white/25 dark:bg-black/45 backdrop-blur-md border border-white/35 text-white hover:bg-white/35 active:scale-95 transition-all cursor-pointer shadow-xl flex items-center justify-center touch-manipulation"
          aria-label="Переключить тему"
          title={darkMode ? 'Светлая тема' : 'Темная тема'}
        >
          {darkMode ? (
            <Sun className="w-5 h-5 sm:w-4 sm:h-4 text-amber-300 animate-spin-slow" />
          ) : (
            <Moon className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
          )}
        </button>
      </motion.div>

      {/* Main Card with Animated Border */}
      <motion.div
        variants={prefersReducedMotion ? undefined : cardVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-[450px] z-10 select-none safe-area-pb safe-area-pt px-1 sm:px-0"
      >
        <AnimatedBorder glow={!isMobile} active={!prefersReducedMotion}>
          <Card maxWidth="full" className="shadow-2xl overflow-hidden backdrop-blur-[20px]">
            
            {/* Header Branding */}
            <CardHeader>
              <motion.div
                whileHover={isMobile ? undefined : { scale: 1.06, rotate: 3 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-[18px] sm:rounded-[20px] bg-gradient-to-tr from-[#0066FF] to-[#9933FF] text-white shadow-lg shadow-[#0066FF]/35 mb-2.5 sm:mb-3.5 relative cursor-pointer group touch-manipulation"
              >
                <AnimatedLockIcon isSpinning={isLoading} size={isMobile ? 24 : 28} />
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#00D084] border-2 border-white dark:border-[#17212b] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                </div>
              </motion.div>

              <CardTitle>Comms</CardTitle>
              <CardDescription className="flex items-center justify-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-[#00D084] shrink-0" />
                Защищенный мессенджер нового поколения
              </CardDescription>
            </CardHeader>

            {/* Smooth Tab Switcher */}
            <div className="glass-tab-container flex p-1 mb-4 sm:mb-5 relative">
              <button
                type="button"
                className="min-h-[44px] flex-1 py-2.5 rounded-[10px] text-xs sm:text-xs font-bold flex items-center justify-center gap-2 transition-colors duration-200 cursor-pointer font-body relative z-10 touch-manipulation text-[#0066FF] dark:text-white"
              >
                <div className="absolute inset-0 bg-white dark:bg-[#242f3d] rounded-[10px] shadow-sm z-[-1]" />
                <LogIn className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span>Вход</span>
              </button>
              
              <button
                type="button"
                onClick={() => setIsRegisterMode(true)}
                className="min-h-[44px] flex-1 py-2.5 rounded-[10px] text-xs sm:text-xs font-semibold flex items-center justify-center gap-2 transition-colors duration-200 cursor-pointer font-body relative z-10 touch-manipulation text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                <UserPlus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span>Регистрация</span>
              </button>
            </div>

            {/* Login Form Body */}
            <div>
              {/* Quick Preset Accounts Selection */}
              <div className="mb-4 sm:mb-5">
                <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 sm:mb-2.5 font-body flex items-center justify-between">
                  <span>Быстрый вход:</span>
                  <span className="text-[10px] opacity-75 font-normal">Демо-аккаунты</span>
                </p>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {PRESET_ACCOUNTS.map((acc) => (
                    <motion.button
                      key={acc.id}
                      type="button"
                      whileHover={isMobile ? undefined : { scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => handleSelectPreset(acc)}
                      disabled={isLoading}
                      className={`min-h-[44px] flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-[12px] sm:rounded-[14px] border transition-all duration-200 cursor-pointer touch-manipulation ${
                        selectedAccountId === acc.id
                          ? 'bg-linear-to-b from-[#0066FF]/20 to-[#0066FF]/5 border-[#0066FF] shadow-sm shadow-[#0066FF]/25'
                          : 'bg-white/40 dark:bg-white/5 border-white/40 dark:border-white/10 hover:bg-white/70 dark:hover:bg-white/10'
                      }`}
                    >
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr ${acc.color} text-white flex items-center justify-center text-xs font-bold shadow-xs mb-1`}>
                        {acc.name.charAt(0)}
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate w-full text-center font-body">
                        {acc.name}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="relative flex py-1 sm:py-2 items-center mb-3.5 sm:mb-4">
                <div className="grow border-t border-slate-300/60 dark:border-white/10"></div>
                <span className="shrink mx-3 text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold font-body">или</span>
                <div className="grow border-t border-slate-300/60 dark:border-white/10"></div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-3 sm:space-y-3.5">
                
                {/* Username / Email Field */}
                <Input
                  label="Email или Username"
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => {
                    setLoginIdentifier(e.target.value);
                    setSelectedAccountId(null);
                    clearError();
                  }}
                  placeholder="vlad / vlad@telegram.org"
                  disabled={isLoading}
                  showClearButton={true}
                  onClear={() => setLoginIdentifier('')}
                  required
                />

                {/* Password Field */}
                <Input
                  label="Пароль"
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    clearError();
                  }}
                  placeholder="••••••••"
                  disabled={isLoading}
                  leftIcon={<KeyRound className="w-4 h-4" />}
                  rightIcon={
                    <motion.div
                      variants={eyeIconVariants}
                      animate={showLoginPassword ? 'visible' : 'hidden'}
                      className="flex items-center justify-center cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4 text-[#0066FF]" /> : <Eye className="w-4 h-4" />}
                    </motion.div>
                  }
                  onRightIconClick={() => {
                    setShowLoginPassword(!showLoginPassword);
                  }}
                  required
                />

                {/* Error Banner */}
                <AnimatePresence>
                  {globalError && (
                    <motion.div
                      variants={errorBannerVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="p-3 rounded-[12px] bg-[#FF3333]/12 border border-[#FF3333]/30 text-[#FF3333] text-xs text-center flex items-center justify-center gap-2 font-medium font-body"
                    >
                      <AnimatedErrorIcon size={18} />
                      <span>{globalError}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size={isMobile ? 'md' : 'lg'}
                  fullWidth
                  isLoading={isLoading}
                  isSuccess={isSuccess}
                  disabled={!loginIdentifier.trim()}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="mt-2"
                >
                  Войти в Comms
                </Button>
              </form>

              {/* Switch to Register Button */}
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(true)}
                  className="text-xs font-semibold text-[#0066FF] hover:underline cursor-pointer"
                >
                  Нет аккаунта? Зарегистрироваться
                </button>
              </div>
            </div>

          </Card>
        </AnimatedBorder>
      </motion.div>

    </GradientBackground>
  );
};
