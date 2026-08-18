import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  Sun, 
  Moon 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  GradientBackground, 
  AnimatedBorder, 
  AnimatedLockIcon, 
  AnimatedErrorIcon 
} from '../components/effects';
import { usePageTransition } from '../components/animations/usePageTransition';
import { useResponsive } from '../hooks/useMediaQuery';

interface LoginPageProps {
  darkMode?: boolean;
  toggleDarkMode?: () => void;
  onNavigateToRegister?: () => void;
  onNavigateToResetPassword?: () => void;
}

const PRESET_ACCOUNTS = [
  { id: 'vlad', name: 'Влад', email: 'vlad@telegram.org', pass: 'vladpass', color: 'from-[#0066FF] to-[#3385FF]' },
  { id: 'anya', name: 'Аня', email: 'anya@telegram.org', pass: 'anyapass', color: 'from-[#FF3385] to-[#FF66AA]' },
  { id: 'mom', name: 'Мама', email: 'mom@telegram.org', pass: 'mompass', color: 'from-[#FF9900] to-[#FFB733]' },
  { id: 'dad', name: 'Папа', email: 'dad@telegram.org', pass: 'dadpass', color: 'from-[#00C2FF] to-[#33D6FF]' },
  { id: 'sister', name: 'Сестра', email: 'sister@telegram.org', pass: 'sispass', color: 'from-[#00D084] to-[#33E0A0]' }
];

export const LoginPage: React.FC<LoginPageProps> = ({
  darkMode = true,
  toggleDarkMode,
  onNavigateToRegister,
  onNavigateToResetPassword,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const { login, isLoading, error, clearError } = useAuth();
  const { isMobile, prefersReducedMotion } = useResponsive();
  const { cardVariants } = usePageTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!identifier.trim()) return;

    const ok = await login(identifier.trim(), password);
    if (ok) {
      setIsSuccess(true);
    }
  };

  const handleSelectPreset = async (account: typeof PRESET_ACCOUNTS[0]) => {
    setSelectedAccountId(account.id);
    setIdentifier(account.email);
    setPassword(account.pass);
    clearError();

    const ok = await login(account.email, account.pass);
    if (ok) {
      setIsSuccess(true);
    }
  };

  return (
    <GradientBackground showParticles={!prefersReducedMotion}>
      
      {/* Top-Right Theme Toggle */}
      {toggleDarkMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 pointer-events-auto"
        >
          <button
            type="button"
            onClick={toggleDarkMode}
            className="min-h-[44px] min-w-[44px] p-2.5 sm:p-3 rounded-[14px] bg-white/25 dark:bg-black/45 backdrop-blur-md border border-white/35 text-white hover:bg-white/35 active:scale-95 transition-all cursor-pointer shadow-xl flex items-center justify-center touch-manipulation"
            title={darkMode ? 'Светлая тема' : 'Темная тема'}
          >
            {darkMode ? (
              <Sun className="w-5 h-5 sm:w-4 sm:h-4 text-amber-300 animate-spin-slow" />
            ) : (
              <Moon className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
            )}
          </button>
        </motion.div>
      )}

      {/* Main Glassmorphism Card */}
      <motion.div
        variants={prefersReducedMotion ? undefined : cardVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-[440px] z-10 select-none px-2 sm:px-0 safe-area-pb safe-area-pt"
      >
        <AnimatedBorder glow={!isMobile} active={!prefersReducedMotion}>
          <Card maxWidth="full" className="shadow-2xl overflow-hidden backdrop-blur-[20px]">
            
            {/* Header */}
            <CardHeader>
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-[18px] bg-linear-to-tr from-[#0066FF] to-[#9933FF] text-white shadow-lg shadow-[#0066FF]/35 mb-2.5 relative">
                <AnimatedLockIcon isSpinning={isLoading} size={isMobile ? 24 : 28} />
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#00D084] border-2 border-white dark:border-[#17212b] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                </div>
              </div>

              <CardTitle>Вход в Comms</CardTitle>
              <CardDescription className="flex items-center justify-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-[#00D084] shrink-0" />
                Supabase Auth · Защищенный доступ
              </CardDescription>
            </CardHeader>

            {/* Quick Fast Login Buttons */}
            <div className="mb-4">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 px-0.5 font-heading">
                Быстрый вход
              </span>
              <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
                {PRESET_ACCOUNTS.map((acc) => {
                  const isSelected = selectedAccountId === acc.id || identifier === acc.email;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleSelectPreset(acc)}
                      disabled={isLoading}
                      className={`flex flex-col items-center gap-1 p-1.5 rounded-[12px] transition-all cursor-pointer select-none touch-manipulation ${
                        isSelected
                          ? 'bg-[#0066FF]/20 ring-2 ring-[#0066FF]'
                          : 'hover:bg-white/40 dark:hover:bg-white/5 active:bg-white/30'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-[10px] bg-linear-to-tr ${acc.color} text-white flex items-center justify-center text-xs font-bold`}>
                        {acc.name.charAt(0)}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-200 truncate w-full text-center">
                        {acc.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-2 sm:my-3">
              <div className="flex-1 h-px bg-slate-200/80 dark:bg-white/10" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Или учетная запись
              </span>
              <div className="flex-1 h-px bg-slate-200/80 dark:bg-white/10" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                label="Email или Username"
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setSelectedAccountId(null);
                  clearError();
                }}
                placeholder="name@example.com или @username"
                disabled={isLoading}
                leftIcon={<Mail className="w-4 h-4" />}
                showClearButton={true}
                onClear={() => setIdentifier('')}
                required
              />

              <Input
                label="Пароль"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError();
                }}
                placeholder="Ваш пароль..."
                disabled={isLoading}
                leftIcon={<KeyRound className="w-4 h-4" />}
                rightIcon={
                  showPassword ? <EyeOff className="w-4 h-4 text-[#0066FF]" /> : <Eye className="w-4 h-4" />
                }
                onRightIconClick={() => setShowPassword(!showPassword)}
                required
              />

              {/* Forgot password link */}
              {onNavigateToResetPassword && (
                <div className="flex justify-end pr-1">
                  <button
                    type="button"
                    onClick={onNavigateToResetPassword}
                    className="text-xs text-[#0066FF] dark:text-[#3385FF] hover:underline cursor-pointer font-medium"
                  >
                    Забыли пароль?
                  </button>
                </div>
              )}

              {/* Error Banner */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="p-3 rounded-[12px] bg-[#FF3333]/12 border border-[#FF3333]/30 text-[#FF3333] text-xs text-center flex items-center justify-center gap-2 font-medium"
                  >
                    <AnimatedErrorIcon size={18} />
                    <span>{error}</span>
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
                disabled={!identifier.trim() || !password}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="mt-2"
              >
                Войти
              </Button>
            </form>

            {/* Navigation to Register */}
            {onNavigateToRegister && (
              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10 text-center text-xs text-slate-600 dark:text-slate-400">
                <span>Нет учетной записи? </span>
                <button
                  type="button"
                  onClick={onNavigateToRegister}
                  className="text-[#0066FF] dark:text-[#3385FF] font-bold hover:underline cursor-pointer"
                >
                  Зарегистрироваться
                </button>
              </div>
            )}

          </Card>
        </AnimatedBorder>
      </motion.div>
    </GradientBackground>
  );
};

export default LoginPage;
