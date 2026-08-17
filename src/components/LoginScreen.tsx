import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import { 
  Mail, 
  User as UserIcon, 
  Sun, 
  Moon,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  UserPlus,
  LogIn,
  KeyRound,
  Sparkles
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { usePageTransition } from './animations/usePageTransition';
import { 
  GradientBackground, 
  AnimatedBorder, 
  AnimatedLockIcon, 
  AnimatedCheckmark, 
  AnimatedErrorIcon, 
  playUISound 
} from './effects';
import { useFormValidation } from './interactions/useFormValidation';
import { useToggleAnimation } from './interactions/useToggleAnimation';

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
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [direction, setDirection] = useState<number>(1);
  
  // Login Form States
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Register Form States
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { login, register, error: serverError } = useSocket();
  const { globalError, setError, clearError, errorBannerVariants } = useFormValidation();
  const { eyeIconVariants } = useToggleAnimation();
  const { cardVariants, tabSlideVariants } = usePageTransition();

  // Sync server errors into validation auto-hide state
  useEffect(() => {
    if (serverError) {
      setError(serverError);
      playUISound('error');
    }
  }, [serverError, setError]);

  const handleTabChange = (tab: 'login' | 'register') => {
    if (tab === activeTab) return;
    playUISound('click');
    setDirection(tab === 'register' ? 1 : -1);
    setActiveTab(tab);
    clearError();
  };

  // Handle Sign In Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!loginIdentifier.trim()) {
      setError('Введите Email, Username или ключ доступа.');
      playUISound('error');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(loginIdentifier.trim(), loginPassword);
      if (success) {
        setIsSuccess(true);
        playUISound('success');
      } else {
        playUISound('error');
        if (!serverError) {
          setError('Не удалось войти. Проверьте логин и пароль.');
        }
      }
    } catch {
      playUISound('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Fast Preset Login
  const handleSelectPresetAccount = async (account: typeof PRESET_ACCOUNTS[0]) => {
    playUISound('click');
    setSelectedAccountId(account.id);
    setLoginIdentifier(account.email);
    setLoginPassword(account.pass);
    clearError();

    setIsLoading(true);
    try {
      const success = await login(account.email, account.pass);
      if (success) {
        setIsSuccess(true);
        playUISound('success');
      } else {
        playUISound('error');
      }
    } catch {
      playUISound('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!regFirstName.trim()) {
      setError('Пожалуйста, введите ваше имя.');
      playUISound('error');
      return;
    }
    if (!regUsername.trim() || regUsername.trim().length < 3) {
      setError('Username должен содержать минимум 3 символа.');
      playUISound('error');
      return;
    }
    if (!regEmail.trim() || !/^\S+@\S+\.\S+$/.test(regEmail.trim())) {
      setError('Введите корректный адрес электронной почты.');
      playUISound('error');
      return;
    }
    if (regPassword.length < 6) {
      setError('Пароль должен содержать не менее 6 символов.');
      playUISound('error');
      return;
    }

    setIsLoading(true);
    try {
      const success = await register({
        firstName: regFirstName.trim(),
        lastName: regLastName.trim(),
        username: regUsername.trim().toLowerCase().replace(/^@/, ''),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
      });

      if (success) {
        setIsSuccess(true);
        playUISound('success');
      } else {
        playUISound('error');
        if (!serverError) {
          setError('Ошибка при создании аккаунта.');
        }
      }
    } catch {
      playUISound('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GradientBackground showParticles={true}>
      
      {/* Fixed Top-Right Theme Toggle Control */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="fixed top-5 right-5 sm:top-6 sm:right-6 z-50 pointer-events-auto"
      >
        <button
          type="button"
          onClick={() => {
            playUISound('click');
            toggleDarkMode();
          }}
          className="p-3 rounded-[14px] bg-white/25 dark:bg-black/45 backdrop-blur-md border border-white/35 text-white hover:bg-white/35 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-xl flex items-center justify-center"
          aria-label="Переключить тему"
          title={darkMode ? 'Светлая тема' : 'Темная тема'}
        >
          {darkMode ? (
            <Sun className="w-4 h-4 text-amber-300 animate-spin-slow" />
          ) : (
            <Moon className="w-4 h-4 text-white" />
          )}
        </button>
      </motion.div>

      {/* Main Card with Animated Border */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-[450px] z-10 select-none"
      >
        <AnimatedBorder glow={true} active={true}>
          <Card maxWidth="full" className="shadow-2xl overflow-hidden backdrop-blur-[20px] hover:backdrop-blur-[28px]">
            
            {/* Header Branding */}
            <CardHeader>
              <motion.div
                whileHover={{ scale: 1.06, rotate: 3 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-[20px] bg-linear-to-tr from-[#0066FF] to-[#9933FF] text-white shadow-lg shadow-[#0066FF]/35 mb-3.5 relative cursor-pointer group"
              >
                <AnimatedLockIcon isSpinning={isLoading} />
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#00D084] border-2 border-white dark:border-[#17212b] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                </div>
              </motion.div>

              <CardTitle>Comms</CardTitle>
              <CardDescription className="flex items-center justify-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-[#00D084] shrink-0" />
                Защищенный мессенджер нового поколения
              </CardDescription>
            </CardHeader>

            {/* Smooth Tab Switcher with Animated layoutId Indicator */}
            <div className="glass-tab-container flex p-1 mb-5 relative">
              <button
                type="button"
                onClick={() => handleTabChange('login')}
                className={`flex-1 py-2.5 rounded-[10px] text-xs font-semibold flex items-center justify-center gap-2 transition-colors duration-200 cursor-pointer font-body relative z-10 ${
                  activeTab === 'login'
                    ? 'text-[#0066FF] dark:text-white font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {activeTab === 'login' && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    className="absolute inset-0 bg-white dark:bg-[#242f3d] rounded-[10px] shadow-sm z-[-1]"
                  />
                )}
                <LogIn className="w-3.5 h-3.5" />
                <span>Вход</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleTabChange('register')}
                className={`flex-1 py-2.5 rounded-[10px] text-xs font-semibold flex items-center justify-center gap-2 transition-colors duration-200 cursor-pointer font-body relative z-10 ${
                  activeTab === 'register'
                    ? 'text-[#0066FF] dark:text-white font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {activeTab === 'register' && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    className="absolute inset-0 bg-white dark:bg-[#242f3d] rounded-[10px] shadow-sm z-[-1]"
                  />
                )}
                <UserPlus className="w-3.5 h-3.5" />
                <span>Регистрация</span>
              </button>
            </div>

            {/* Sliding Form Container */}
            <div className="relative min-h-[300px] overflow-hidden">
              <AnimatePresence custom={direction} mode="wait">
                
                {/* TAB 1: LOGIN */}
                {activeTab === 'login' && (
                  <motion.div
                    key="login-form"
                    custom={direction}
                    variants={tabSlideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="space-y-4"
                  >
                    {/* Quick Profile Select */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2 px-0.5 font-heading">
                        Быстрый вход
                      </label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {PRESET_ACCOUNTS.map((acc) => {
                          const isSelected = selectedAccountId === acc.id || loginIdentifier === acc.email || loginIdentifier === acc.pass;
                          return (
                            <motion.button
                              key={acc.id}
                              type="button"
                              whileHover={{ scale: 1.08, y: -2 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleSelectPresetAccount(acc)}
                              disabled={isLoading}
                              className={`flex flex-col items-center gap-1.5 p-2 rounded-[14px] transition-smooth cursor-pointer select-none ${
                                isSelected
                                  ? 'bg-[#0066FF]/15 ring-2 ring-[#0066FF] shadow-md'
                                  : 'hover:bg-white/40 dark:hover:bg-white/5'
                              }`}
                              title={`Войти как ${acc.name}`}
                            >
                              <div className={`w-9 h-9 rounded-[12px] bg-linear-to-tr ${acc.color} text-white flex items-center justify-center text-xs font-bold shadow-xs`}>
                                {acc.name.charAt(0)}
                              </div>
                              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate w-full text-center font-body">
                                {acc.name}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px bg-slate-200/80 dark:bg-white/10" />
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        Или аккаунт
                      </span>
                      <div className="flex-1 h-px bg-slate-200/80 dark:bg-white/10" />
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                      <Input
                        label="Логин или Email"
                        type="text"
                        value={loginIdentifier}
                        onChange={(e) => {
                          setLoginIdentifier(e.target.value);
                          setSelectedAccountId(null);
                          clearError();
                        }}
                        placeholder="Email, @username или ключ..."
                        disabled={isLoading}
                        leftIcon={<Mail className="w-4 h-4" />}
                        showClearButton={true}
                        onClear={() => setLoginIdentifier('')}
                        required
                      />

                      <Input
                        label="Пароль"
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          clearError();
                        }}
                        placeholder="Ваш пароль..."
                        disabled={isLoading}
                        leftIcon={<KeyRound className="w-4 h-4" />}
                        rightIcon={
                          <motion.div
                            variants={eyeIconVariants}
                            animate={showLoginPassword ? 'visible' : 'hidden'}
                            className="flex items-center justify-center"
                          >
                            {showLoginPassword ? <EyeOff className="w-4 h-4 text-[#0066FF]" /> : <Eye className="w-4 h-4" />}
                          </motion.div>
                        }
                        onRightIconClick={() => {
                          playUISound('click');
                          setShowLoginPassword(!showLoginPassword);
                        }}
                      />

                      {/* Error Banner with 5s Auto-hide & Wobble Icon */}
                      <AnimatePresence>
                        {globalError && (
                          <motion.div
                            variants={errorBannerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="p-3 rounded-[12px] bg-[#FF3333]/12 border border-[#FF3333]/30 text-[#FF3333] text-xs text-center flex items-center justify-center gap-2 font-medium font-body animate-error-shake"
                          >
                            <AnimatedErrorIcon size={18} />
                            <span>{globalError}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Submit Button with Success Morph */}
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
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
                  </motion.div>
                )}

                {/* TAB 2: REGISTER */}
                {activeTab === 'register' && (
                  <motion.div
                    key="register-form"
                    custom={direction}
                    variants={tabSlideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                  >
                    <form onSubmit={handleRegisterSubmit} className="space-y-3">
                      
                      {/* First & Last Name */}
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label="Имя *"
                          type="text"
                          value={regFirstName}
                          onChange={(e) => {
                            setRegFirstName(e.target.value);
                            clearError();
                          }}
                          placeholder="Имя"
                          disabled={isLoading}
                          showClearButton={true}
                          onClear={() => setRegFirstName('')}
                          required
                        />
                        <Input
                          label="Фамилия"
                          type="text"
                          value={regLastName}
                          onChange={(e) => {
                            setRegLastName(e.target.value);
                            clearError();
                          }}
                          placeholder="Фамилия"
                          disabled={isLoading}
                          showClearButton={true}
                          onClear={() => setRegLastName('')}
                        />
                      </div>

                      {/* Username */}
                      <Input
                        label="Username *"
                        type="text"
                        value={regUsername}
                        maxLength={30}
                        showCount={true}
                        onChange={(e) => {
                          setRegUsername(e.target.value.replace(/\s+/g, ''));
                          clearError();
                        }}
                        placeholder="уникальный_username"
                        disabled={isLoading}
                        leftIcon={<UserIcon className="w-4 h-4" />}
                        showClearButton={true}
                        onClear={() => setRegUsername('')}
                        required
                      />

                      {/* Email */}
                      <Input
                        label="Электронная почта *"
                        type="email"
                        value={regEmail}
                        onChange={(e) => {
                          setRegEmail(e.target.value);
                          clearError();
                        }}
                        placeholder="name@example.com"
                        disabled={isLoading}
                        leftIcon={<Mail className="w-4 h-4" />}
                        showClearButton={true}
                        onClear={() => setRegEmail('')}
                        required
                      />

                      {/* Password */}
                      <Input
                        label="Пароль *"
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => {
                          setRegPassword(e.target.value);
                          clearError();
                        }}
                        placeholder="Минимум 6 символов"
                        disabled={isLoading}
                        leftIcon={<KeyRound className="w-4 h-4" />}
                        rightIcon={
                          <motion.div
                            variants={eyeIconVariants}
                            animate={showRegPassword ? 'visible' : 'hidden'}
                            className="flex items-center justify-center"
                          >
                            {showRegPassword ? <EyeOff className="w-4 h-4 text-[#0066FF]" /> : <Eye className="w-4 h-4" />}
                          </motion.div>
                        }
                        onRightIconClick={() => {
                          playUISound('click');
                          setShowRegPassword(!showRegPassword);
                        }}
                        required
                      />

                      {/* Password Strength Indicator with Spring Checkmark */}
                      {regPassword.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-1.5 px-1 text-[11px] font-body"
                        >
                          {regPassword.length >= 6 ? (
                            <>
                              <AnimatedCheckmark size={15} />
                              <span className="text-[#00D084] font-semibold">Надежный пароль</span>
                            </>
                          ) : (
                            <>
                              <span className="text-amber-500 font-bold animate-icon-wobble">⚠️</span>
                              <span className="text-amber-500 font-medium">Минимум 6 символов</span>
                            </>
                          )}
                        </motion.div>
                      )}

                      {/* Error Banner with 5s Auto-hide */}
                      <AnimatePresence>
                        {globalError && (
                          <motion.div
                            variants={errorBannerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="p-3 rounded-[12px] bg-[#FF3333]/12 border border-[#FF3333]/30 text-[#FF3333] text-xs text-center flex items-center justify-center gap-2 font-medium font-body animate-error-shake"
                          >
                            <AnimatedErrorIcon size={18} />
                            <span>{globalError}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Submit Button with Success Morph */}
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        fullWidth
                        isLoading={isLoading}
                        isSuccess={isSuccess}
                        disabled={!regFirstName.trim() || !regEmail.trim() || regPassword.length < 6}
                        leftIcon={<Sparkles className="w-4 h-4" />}
                        className="mt-2"
                      >
                        Создать аккаунт
                      </Button>
                    </form>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Footer info */}
            <div className="mt-5 pt-3 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              <span>Comms v2.5 · Micro-FX</span>
              <span className="text-[#00D084] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D084] inline-block animate-pulse" />
                Сервер активен
              </span>
            </div>

          </Card>
        </AnimatedBorder>
      </motion.div>
    </GradientBackground>
  );
};

export default LoginScreen;
