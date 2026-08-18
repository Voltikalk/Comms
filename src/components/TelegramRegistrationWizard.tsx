import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, type Variants, type Transition } from 'framer-motion';
import { 
  ArrowLeft, 
  Mail, 
  Camera, 
  Check, 
  ZoomIn, 
  ZoomOut, 
  Sun, 
  Moon, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export interface TelegramRegistrationWizardProps {
  darkMode?: boolean;
  toggleDarkMode?: () => void;
  onCancel?: () => void;
  onSuccess?: () => void;
}

// Telegram Avatar Gradient Presets
const AVATAR_GRADIENTS = [
  'from-[#3390ec] to-[#0066FF]',
  'from-[#FF5E62] to-[#FF9966]',
  'from-[#11998e] to-[#38ef7d]',
  'from-[#8E2DE2] to-[#4A00E0]',
  'from-[#F2994A] to-[#F2C94C]',
  'from-[#EC008C] to-[#FC6767]',
  'from-[#00c6ff] to-[#0072ff]',
];

const slideVariants: Variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 50 : -50,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -50 : 50,
    opacity: 0,
    scale: 0.98,
  }),
};

const slideTransition: Transition = {
  x: { duration: 0.28, ease: 'easeInOut' },
  opacity: { duration: 0.22 },
  scale: { duration: 0.28 },
};

export const TelegramRegistrationWizard: React.FC<TelegramRegistrationWizardProps> = ({
  darkMode = true,
  toggleDarkMode,
  onCancel,
  onSuccess,
}) => {
  const { register } = useSocket();

  // Wizard Navigation State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [direction, setDirection] = useState<number>(1); // 1 = forward, -1 = backward
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Step 1: Email
  const [email, setEmail] = useState<string>('');
  const [emailError, setEmailError] = useState<string | null>(null);

  // Step 2: 6-Digit Code
  const [codeDigits, setCodeDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState<number>(30);
  const [isCodeResent, setIsCodeResent] = useState<boolean>(false);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 3: Names & Username
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [nameError, setNameError] = useState<string | null>(null);

  // Step 4: Avatar Upload & Crop
  const [avatarRawUrl, setAvatarRawUrl] = useState<string | null>(null);
  const [avatarCroppedUrl, setAvatarCroppedUrl] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [cropZoom, setCropZoom] = useState<number>(1);
  const [cropPosition, setCropPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingCrop, setIsDraggingCrop] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({ startX: 0, startY: 0, posX: 0, posY: 0 });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rawImageRef = useRef<HTMLImageElement | null>(null);

  // Email Validation Regex
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Resend Countdown Timer (Step 2)
  useEffect(() => {
    let timer: any = null;
    if (currentStep === 2 && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [currentStep, resendTimer]);

  // Step Navigation Handlers
  const goToNextStep = (targetStep?: number) => {
    setDirection(1);
    setGeneralError(null);
    setCurrentStep((prev) => targetStep || prev + 1);
  };

  const goToPrevStep = () => {
    if (currentStep <= 1) {
      onCancel?.();
      return;
    }
    setDirection(-1);
    setGeneralError(null);
    setCurrentStep((prev) => prev - 1);
  };

  // Step 1: Submit Email
  const handleEmailSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isEmailValid) {
      setEmailError('Пожалуйста, введите корректный адрес эл. почты');
      return;
    }
    setEmailError(null);
    setResendTimer(30);
    setIsCodeResent(false);
    // Auto-generate username base if empty
    if (!username) {
      const suggested = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
      setUsername(suggested || 'user');
    }
    goToNextStep(2);
  };

  // Step 2: Code Digit Change
  const handleDigitChange = (index: number, val: string) => {
    setCodeError(null);
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned) {
      const next = [...codeDigits];
      next[index] = '';
      setCodeDigits(next);
      return;
    }

    const digit = cleaned.slice(-1);
    const next = [...codeDigits];
    next[index] = digit;
    setCodeDigits(next);

    // Auto-focus next cell
    if (index < 5 && digit) {
      digitInputRefs.current[index + 1]?.focus();
    }

    // Auto submit if all 6 digits entered
    if (index === 5 || next.every((d) => d.length === 1)) {
      const fullCode = next.join('');
      if (fullCode.length === 6) {
        setTimeout(() => {
          goToNextStep(3);
        }, 150);
      }
    }
  };

  // Step 2: Handle KeyDown (Backspace & Arrow Navigation)
  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!codeDigits[index] && index > 0) {
        digitInputRefs.current[index - 1]?.focus();
        const next = [...codeDigits];
        next[index - 1] = '';
        setCodeDigits(next);
      } else {
        const next = [...codeDigits];
        next[index] = '';
        setCodeDigits(next);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      digitInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  // Step 2: Handle Paste
  const handleDigitPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setCodeDigits(next);

    const targetFocus = Math.min(pasted.length, 5);
    digitInputRefs.current[targetFocus]?.focus();

    if (pasted.length === 6) {
      setTimeout(() => {
        goToNextStep(3);
      }, 180);
    }
  };

  // Step 2: Resend Code
  const handleResendCode = () => {
    if (resendTimer > 0) return;
    setResendTimer(30);
    setIsCodeResent(true);
    setCodeDigits(['', '', '', '', '', '']);
    digitInputRefs.current[0]?.focus();
    setTimeout(() => setIsCodeResent(false), 3000);
  };

  // Step 3: Submit Names
  const handleNamesSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!firstName.trim()) {
      setNameError('Имя обязательно для заполнения');
      return;
    }
    setNameError(null);
    goToNextStep(4);
  };

  // Initials generator for live avatar preview
  const getInitials = () => {
    const f = firstName.trim();
    const l = lastName.trim();
    if (!f && !l) return email ? email.charAt(0).toUpperCase() : '?';
    if (f && l) return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
    return f.charAt(0).toUpperCase();
  };

  // Avatar gradient selector based on name
  const getGradientIndex = () => {
    const str = `${firstName}${lastName}${email}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % AVATAR_GRADIENTS.length;
  };

  // Step 4: Handle File Upload
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setGeneralError('Пожалуйста, выберите изображение (PNG, JPG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setAvatarRawUrl(url);
      setCropZoom(1);
      setCropPosition({ x: 0, y: 0 });
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
  };

  // Step 4: Perform Canvas Circular Crop
  const applyCrop = useCallback(() => {
    if (!rawImageRef.current) return;
    const img = rawImageRef.current;
    const canvas = document.createElement('canvas');
    const size = 320; // High resolution crop
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, size, size);

    const imgWidth = img.naturalWidth || img.width;
    const imgHeight = img.naturalHeight || img.height;
    const baseScale = Math.max(size / imgWidth, size / imgHeight);
    const finalScale = baseScale * cropZoom;

    const drawWidth = imgWidth * finalScale;
    const drawHeight = imgHeight * finalScale;
    const drawX = (size - drawWidth) / 2 + cropPosition.x;
    const drawY = (size - drawHeight) / 2 + cropPosition.y;

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setAvatarCroppedUrl(croppedDataUrl);
    setIsCropping(false);
  }, [cropZoom, cropPosition]);

  // Final Registration Action
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setGeneralError(null);

    const finalFirstName = firstName.trim();
    const finalLastName = lastName.trim();
    const finalUsername = username.trim() || email.split('@')[0].toLowerCase();
    const finalAvatar = avatarCroppedUrl || '';

    try {
      const success = await register({
        username: finalUsername,
        password: 'comms_default_secure_pass',
        firstName: finalFirstName,
        lastName: finalLastName,
        email: email.trim(),
        avatarUrl: finalAvatar,
      });

      if (success) {
        onSuccess?.();
      } else {
        setGeneralError('Ошибка при создании профиля. Попробуйте еще раз.');
      }
    } catch (err: any) {
      setGeneralError(err?.message || 'Не удалось завершить регистрацию');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-[#0e1621] text-slate-900 dark:text-white transition-colors duration-300 relative select-none">
      
      {/* Top Bar: Back button (Step > 1) & Theme toggle */}
      <div className="fixed top-4 left-4 right-4 max-w-lg mx-auto flex items-center justify-between z-40 pointer-events-auto">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={goToPrevStep}
            className="p-2.5 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer flex items-center justify-center active:scale-95 shadow-xs"
            title="Назад"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="p-2.5 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer flex items-center justify-center active:scale-95 shadow-xs"
            title="Назад ко входу"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-10 h-10" />
        )}

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
      <div className="w-full max-w-[400px] flex flex-col items-center justify-center min-h-[460px] relative">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          
          {/* ================================================================= */}
          {/* STEP 1: EMAIL INPUT                                               */}
          {/* ================================================================= */}
          {currentStep === 1 && (
            <motion.div
              key="step-1-email"
              custom={direction}
              variants={slideVariants}
              transition={slideTransition}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full flex flex-col items-center text-center"
            >
              {/* Telegram Logo / App Icon */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#3390ec] to-[#0072ff] text-white flex items-center justify-center shadow-lg shadow-[#3390ec]/25 mb-6">
                <Mail className="w-9 h-9 text-white" />
              </div>

              <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                Регистрация
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-8">
                Введите ваш адрес эл. почты для получения кода подтверждения
              </p>

              <form onSubmit={handleEmailSubmit} className="w-full space-y-4">
                <div className="relative w-full">
                  <input
                    type="email"
                    autoFocus
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    placeholder="Электронная почта"
                    className={`w-full px-4 py-3.5 rounded-2xl text-base bg-white dark:bg-[#17212b] border outline-hidden transition-all text-slate-900 dark:text-white placeholder:text-slate-400 ${
                      emailError 
                        ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20' 
                        : 'border-slate-200 dark:border-white/10 focus:border-[#3390ec] focus:ring-4 focus:ring-[#3390ec]/15 shadow-xs'
                    }`}
                  />
                </div>

                {emailError && (
                  <p className="text-xs text-rose-500 text-left px-1 font-medium">
                    {emailError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!isEmailValid}
                  className={`w-full py-3.5 px-6 rounded-2xl text-base font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                    isEmailValid
                      ? 'bg-[#3390ec] hover:bg-[#2b7ac9] active:bg-[#2469ab] text-white shadow-[#3390ec]/25 hover:shadow-lg active:scale-[0.99]'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-70 shadow-none'
                  }`}
                >
                  <span>Далее</span>
                </button>
              </form>

              {onCancel && (
                <div className="mt-8">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="text-xs font-medium text-[#3390ec] hover:underline cursor-pointer"
                  >
                    Уже зарегистрированы? Войти
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ================================================================= */}
          {/* STEP 2: 6-DIGIT VERIFICATION CODE                                 */}
          {/* ================================================================= */}
          {currentStep === 2 && (
            <motion.div
              key="step-2-code"
              custom={direction}
              variants={slideVariants}
              transition={slideTransition}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-full bg-[#3390ec]/10 text-[#3390ec] flex items-center justify-center mb-5">
                <Sparkles className="w-8 h-8" />
              </div>

              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Код подтверждения
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-8">
                Мы отправили 6-значный код на <strong className="font-semibold text-slate-800 dark:text-slate-200">{email}</strong>
              </p>

              {/* 6 Digit Input Cells */}
              <div className="flex items-center justify-center gap-2 sm:gap-2.5 mb-6 w-full" onPaste={handleDigitPaste}>
                {codeDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { digitInputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    autoFocus={idx === 0}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                    className="w-12 h-14 sm:w-13 sm:h-15 text-center text-2xl font-bold font-mono rounded-2xl bg-white dark:bg-[#17212b] border border-slate-200 dark:border-white/10 focus:border-[#3390ec] focus:ring-4 focus:ring-[#3390ec]/20 outline-hidden transition-all text-slate-900 dark:text-white shadow-xs"
                  />
                ))}
              </div>

              {codeError && (
                <p className="text-xs text-rose-500 mb-4 font-medium">
                  {codeError}
                </p>
              )}

              {/* Resend Code Timer or Action */}
              <div className="mb-6">
                {resendTimer > 0 ? (
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    Отправить код повторно через 0:{resendTimer < 10 ? `0${resendTimer}` : resendTimer}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="text-xs font-semibold text-[#3390ec] hover:underline cursor-pointer flex items-center gap-1.5 mx-auto"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Отправить код повторно</span>
                  </button>
                )}
                {isCodeResent && (
                  <p className="text-xs text-emerald-500 mt-1 font-medium">
                    Код успешно отправлен!
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => goToNextStep(3)}
                disabled={codeDigits.join('').length < 6}
                className={`w-full py-3.5 px-6 rounded-2xl text-base font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                  codeDigits.join('').length === 6
                    ? 'bg-[#3390ec] hover:bg-[#2b7ac9] text-white shadow-[#3390ec]/25 active:scale-[0.99]'
                    : 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-70 shadow-none'
                }`}
              >
                <span>Далее</span>
              </button>
            </motion.div>
          )}

          {/* ================================================================= */}
          {/* STEP 3: FIRST & LAST NAME WITH LIVE INITIALS PREVIEW               */}
          {/* ================================================================= */}
          {currentStep === 3 && (
            <motion.div
              key="step-3-names"
              custom={direction}
              variants={slideVariants}
              transition={slideTransition}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full flex flex-col items-center text-center"
            >
              {/* Dynamic Live Initials Avatar */}
              <div className="relative mb-6">
                <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr ${AVATAR_GRADIENTS[getGradientIndex()]} text-white flex items-center justify-center text-3xl sm:text-4xl font-bold shadow-xl ring-4 ring-white dark:ring-[#17212b] transition-all duration-300 select-none`}>
                  {getInitials()}
                </div>
              </div>

              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Ваше имя
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-6">
                Введите ваше имя и фамилию для отображения в профиле
              </p>

              <form onSubmit={handleNamesSubmit} className="w-full space-y-3.5">
                <div className="w-full">
                  <input
                    type="text"
                    autoFocus
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (nameError) setNameError(null);
                    }}
                    placeholder="Имя (обязательно)"
                    className={`w-full px-4 py-3 rounded-2xl text-base bg-white dark:bg-[#17212b] border outline-hidden transition-all text-slate-900 dark:text-white placeholder:text-slate-400 ${
                      nameError 
                        ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20' 
                        : 'border-slate-200 dark:border-white/10 focus:border-[#3390ec] focus:ring-4 focus:ring-[#3390ec]/15 shadow-xs'
                    }`}
                  />
                </div>

                <div className="w-full">
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Фамилия (опционально)"
                    className="w-full px-4 py-3 rounded-2xl text-base bg-white dark:bg-[#17212b] border border-slate-200 dark:border-white/10 focus:border-[#3390ec] focus:ring-4 focus:ring-[#3390ec]/15 outline-hidden transition-all text-slate-900 dark:text-white placeholder:text-slate-400 shadow-xs"
                  />
                </div>

                {nameError && (
                  <p className="text-xs text-rose-500 text-left px-1 font-medium">
                    {nameError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!firstName.trim()}
                  className={`w-full mt-2 py-3.5 px-6 rounded-2xl text-base font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                    firstName.trim()
                      ? 'bg-[#3390ec] hover:bg-[#2b7ac9] text-white shadow-[#3390ec]/25 active:scale-[0.99]'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-70 shadow-none'
                  }`}
                >
                  <span>Далее</span>
                </button>
              </form>
            </motion.div>
          )}

          {/* ================================================================= */}
          {/* STEP 4: OPTIONAL AVATAR UPLOAD & CIRCULAR CROPPER                  */}
          {/* ================================================================= */}
          {currentStep === 4 && (
            <motion.div
              key="step-4-avatar"
              custom={direction}
              variants={slideVariants}
              transition={slideTransition}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full flex flex-col items-center text-center"
            >
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Фото профиля
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-6">
                Загрузите фото профиля или оставьте стильную аватарку с инициалами
              </p>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />

              {/* Cropper View or Circular Avatar Display */}
              {!isCropping ? (
                <div className="flex flex-col items-center mb-8">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative group cursor-pointer"
                    title="Нажмите для выбора фото"
                  >
                    {avatarCroppedUrl ? (
                      <img 
                        src={avatarCroppedUrl} 
                        alt="Avatar Preview" 
                        className="w-32 h-32 sm:w-36 sm:h-36 rounded-full object-cover shadow-xl ring-4 ring-[#3390ec]/30 group-hover:opacity-90 transition-all"
                      />
                    ) : (
                      <div className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr ${AVATAR_GRADIENTS[getGradientIndex()]} text-white flex items-center justify-center text-4xl sm:text-5xl font-bold shadow-xl ring-4 ring-white dark:ring-[#17212b] group-hover:scale-[1.02] transition-all`}>
                        {getInitials()}
                      </div>
                    )}

                    {/* Camera Badge Overlay */}
                    <div className="absolute bottom-1 right-1 p-3 rounded-full bg-[#3390ec] text-white shadow-lg group-hover:bg-[#2b7ac9] group-hover:scale-110 transition-all">
                      <Camera className="w-5 h-5" />
                    </div>
                  </div>

                  {avatarCroppedUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarCroppedUrl(null);
                        setAvatarRawUrl(null);
                      }}
                      className="mt-3 text-xs text-rose-500 hover:underline cursor-pointer"
                    >
                      Удалить фото
                    </button>
                  )}
                </div>
              ) : (
                /* Built-in Circular Crop Interface */
                <div className="w-full flex flex-col items-center mb-6 bg-slate-100 dark:bg-[#17212b] p-4 rounded-3xl border border-slate-200 dark:border-white/10">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-medium">
                    Перетащите и масштабируйте фото в круге:
                  </p>

                  {/* Circular Crop Viewport */}
                  <div 
                    className="relative w-44 h-44 rounded-full overflow-hidden border-4 border-[#3390ec] shadow-2xl cursor-grab active:cursor-grabbing select-none touch-none bg-black flex items-center justify-center"
                    onMouseDown={(e) => {
                      setIsDraggingCrop(true);
                      dragStartRef.current = {
                        startX: e.clientX,
                        startY: e.clientY,
                        posX: cropPosition.x,
                        posY: cropPosition.y,
                      };
                    }}
                    onMouseMove={(e) => {
                      if (!isDraggingCrop) return;
                      const dx = e.clientX - dragStartRef.current.startX;
                      const dy = e.clientY - dragStartRef.current.startY;
                      setCropPosition({
                        x: dragStartRef.current.posX + dx,
                        y: dragStartRef.current.posY + dy,
                      });
                    }}
                    onMouseUp={() => setIsDraggingCrop(false)}
                    onMouseLeave={() => setIsDraggingCrop(false)}
                    onTouchStart={(e) => {
                      if (e.touches.length === 1) {
                        setIsDraggingCrop(true);
                        dragStartRef.current = {
                          startX: e.touches[0].clientX,
                          startY: e.touches[0].clientY,
                          posX: cropPosition.x,
                          posY: cropPosition.y,
                        };
                      }
                    }}
                    onTouchMove={(e) => {
                      if (!isDraggingCrop || e.touches.length !== 1) return;
                      const dx = e.touches[0].clientX - dragStartRef.current.startX;
                      const dy = e.touches[0].clientY - dragStartRef.current.startY;
                      setCropPosition({
                        x: dragStartRef.current.posX + dx,
                        y: dragStartRef.current.posY + dy,
                      });
                    }}
                    onTouchEnd={() => setIsDraggingCrop(false)}
                  >
                    {avatarRawUrl && (
                      <img
                        ref={rawImageRef}
                        src={avatarRawUrl}
                        alt="Crop target"
                        draggable={false}
                        style={{
                          transform: `translate(${cropPosition.x}px, ${cropPosition.y}px) scale(${cropZoom})`,
                          transformOrigin: 'center center',
                          maxWidth: 'none',
                          userSelect: 'none',
                          pointerEvents: 'none',
                        }}
                        className="transition-transform duration-75"
                      />
                    )}
                  </div>

                  {/* Zoom Slider */}
                  <div className="flex items-center gap-3 w-full max-w-[260px] mt-4">
                    <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.05}
                      value={cropZoom}
                      onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                      className="w-full accent-[#3390ec] cursor-pointer"
                    />
                    <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>

                  {/* Cropper Action Buttons */}
                  <div className="flex items-center gap-2.5 w-full mt-4">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-2 px-3 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      Сменить
                    </button>
                    <button
                      type="button"
                      onClick={applyCrop}
                      className="flex-1 py-2 px-3 text-xs font-semibold rounded-xl bg-[#3390ec] hover:bg-[#2b7ac9] text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                      <span>Применить</span>
                    </button>
                  </div>
                </div>
              )}

              {generalError && (
                <p className="text-xs text-rose-500 mb-4 font-medium">
                  {generalError}
                </p>
              )}

              {/* Action Buttons: "Пропустить" & "Готово" */}
              {!isCropping && (
                <div className="flex items-center gap-3 w-full">
                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={isSubmitting}
                    className="flex-1 py-3.5 px-4 rounded-2xl text-sm font-semibold bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 transition-all cursor-pointer text-center"
                  >
                    Пропустить
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={isSubmitting}
                    className="flex-1 py-3.5 px-4 rounded-2xl text-sm font-semibold bg-[#3390ec] hover:bg-[#2b7ac9] active:bg-[#2469ab] text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-[#3390ec]/25 active:scale-[0.99]"
                  >
                    {isSubmitting ? (
                      <span>Создание...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Готово</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
};

export default TelegramRegistrationWizard;
