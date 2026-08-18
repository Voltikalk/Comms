import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  User as UserIcon, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ShieldCheck, 
  Sun, 
  Moon,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  GradientBackground, 
  AnimatedBorder, 
  AnimatedCheckmark, 
  AnimatedErrorIcon 
} from '../components/effects';
import { usePageTransition } from '../components/animations/usePageTransition';
import { useResponsive } from '../hooks/useMediaQuery';

interface RegisterPageProps {
  darkMode?: boolean;
  toggleDarkMode?: () => void;
  onNavigateToLogin?: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  darkMode = true,
  toggleDarkMode,
  onNavigateToLogin,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, isLoading, error, clearError } = useAuth();
  const { isMobile, prefersReducedMotion } = useResponsive();
  const { cardVariants } = usePageTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const displayName = cleanLast ? `${cleanFirst} ${cleanLast}` : cleanFirst;

    const ok = await register({
      email: email.trim(),
      username: username.trim(),
      password,
      displayName,
    });

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
                <Sparkles className="w-7 h-7" />
              </div>

              <CardTitle>Создать аккаунт</CardTitle>
              <CardDescription className="flex items-center justify-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-[#00D084] shrink-0" />
                Регистрация в Comms Messenger
              </CardDescription>
            </CardHeader>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              
              {/* Names */}
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Имя *"
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    clearError();
                  }}
                  placeholder="Имя"
                  disabled={isLoading}
                  showClearButton={true}
                  onClear={() => setFirstName('')}
                  required
                />
                <Input
                  label="Фамилия"
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    clearError();
                  }}
                  placeholder="Фамилия"
                  disabled={isLoading}
                  showClearButton={true}
                  onClear={() => setLastName('')}
                />
              </div>

              {/* Username */}
              <Input
                label="Username *"
                type="text"
                value={username}
                maxLength={30}
                showCount={true}
                onChange={(e) => {
                  setUsername(e.target.value.replace(/\s+/g, ''));
                  clearError();
                }}
                placeholder="уникальный_username"
                disabled={isLoading}
                leftIcon={<UserIcon className="w-4 h-4" />}
                showClearButton={true}
                onClear={() => setUsername('')}
                required
              />

              {/* Email */}
              <Input
                label="Электронная почта *"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError();
                }}
                placeholder="name@example.com"
                disabled={isLoading}
                leftIcon={<Mail className="w-4 h-4" />}
                showClearButton={true}
                onClear={() => setEmail('')}
                required
              />

              {/* Password */}
              <Input
                label="Пароль *"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError();
                }}
                placeholder="Минимум 6 символов"
                disabled={isLoading}
                leftIcon={<KeyRound className="w-4 h-4" />}
                rightIcon={
                  showPassword ? <EyeOff className="w-4 h-4 text-[#0066FF]" /> : <Eye className="w-4 h-4" />
                }
                onRightIconClick={() => setShowPassword(!showPassword)}
                required
              />

              {/* Password Strength Status */}
              {password.length > 0 && (
                <div className="flex items-center gap-1.5 px-1 text-[11px]">
                  {password.length >= 6 ? (
                    <>
                      <AnimatedCheckmark size={15} />
                      <span className="text-[#00D084] font-semibold">Надежный пароль</span>
                    </>
                  ) : (
                    <>
                      <span className="text-amber-500 font-bold">⚠️</span>
                      <span className="text-amber-500 font-medium">Минимум 6 символов</span>
                    </>
                  )}
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
                disabled={!firstName.trim() || !username.trim() || !email.trim() || password.length < 6}
                leftIcon={<Sparkles className="w-4 h-4" />}
                className="mt-2"
              >
                Создать аккаунт
              </Button>
            </form>

            {/* Navigation back to login */}
            {onNavigateToLogin && (
              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10 text-center text-xs text-slate-600 dark:text-slate-400">
                <span>Уже есть аккаунт? </span>
                <button
                  type="button"
                  onClick={onNavigateToLogin}
                  className="text-[#0066FF] dark:text-[#3385FF] font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Войти</span>
                </button>
              </div>
            )}

          </Card>
        </AnimatedBorder>
      </motion.div>
    </GradientBackground>
  );
};

export default RegisterPage;
