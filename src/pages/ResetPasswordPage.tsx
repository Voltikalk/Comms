import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  KeyRound, 
  ArrowLeft, 
  Send, 
  CheckCircle2, 
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
  AnimatedErrorIcon 
} from '../components/effects';
import { usePageTransition } from '../components/animations/usePageTransition';
import { useResponsive } from '../hooks/useMediaQuery';

interface ResetPasswordPageProps {
  darkMode?: boolean;
  toggleDarkMode?: () => void;
  onNavigateToLogin?: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  darkMode = true,
  toggleDarkMode,
  onNavigateToLogin,
}) => {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);

  const { resetPassword, isLoading, error, clearError } = useAuth();
  const { isMobile, prefersReducedMotion } = useResponsive();
  const { cardVariants } = usePageTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!email.trim()) return;

    const ok = await resetPassword(email.trim());
    if (ok) {
      setIsSent(true);
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
                <KeyRound className="w-7 h-7" />
              </div>

              <CardTitle>Восстановление</CardTitle>
              <CardDescription className="flex items-center justify-center gap-1.5 font-medium">
                Сброс пароля через Supabase Auth
              </CardDescription>
            </CardHeader>

            {isSent ? (
              /* Success State */
              <div className="space-y-4 py-2 text-center animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-[#00D084]/20 border border-[#00D084]/40 text-[#00D084] mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                    Письмо отправлено!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Инструкции по восстановлению пароля отправлены на <b className="text-slate-800 dark:text-slate-200">{email}</b>. Проверьте ваш почтовый ящик.
                  </p>
                </div>

                {onNavigateToLogin && (
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    onClick={onNavigateToLogin}
                    leftIcon={<ArrowLeft className="w-4 h-4" />}
                    className="mt-4"
                  >
                    Вернуться ко входу
                  </Button>
                )}
              </div>
            ) : (
              /* Form State */
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center px-2">
                  Введите ваш email, и мы отправим вам безопасную ссылку для сброса пароля.
                </p>

                <Input
                  label="Электронная почта"
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
                  disabled={!email.trim()}
                  rightIcon={<Send className="w-4 h-4" />}
                  className="mt-2"
                >
                  Отправить ссылку
                </Button>
              </form>
            )}

            {/* Back to Login Link */}
            {!isSent && onNavigateToLogin && (
              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10 text-center text-xs text-slate-600 dark:text-slate-400">
                <button
                  type="button"
                  onClick={onNavigateToLogin}
                  className="text-[#0066FF] dark:text-[#3385FF] font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Назад к авторизации</span>
                </button>
              </div>
            )}

          </Card>
        </AnimatedBorder>
      </motion.div>
    </GradientBackground>
  );
};

export default ResetPasswordPage;
