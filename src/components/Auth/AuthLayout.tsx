import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, KeyRound, Lock, MonitorSmartphone, Send, ShieldCheck } from 'lucide-react';
import { BubbleTail } from '../Chat/Feed/BubbleTail';
import { Skiper26ThemeToggle } from '../ui/skiper26';

const SPRING = { type: 'spring', stiffness: 400, damping: 28 } as const;

const PREVIEW_MESSAGES: ReadonlyArray<{ self: boolean; text: string; time: string }> = [
  { self: false, text: 'Привет! Это точно никто не прочитает? 🔐', time: '21:04' },
  { self: true, text: 'Да, сквозное шифрование — ключи только у нас двоих', time: '21:04' },
  { self: false, text: 'А если украдут пароль?', time: '21:05' },
  { self: true, text: 'Облачный пароль и список сеансов. Лишнее завершу в один клик 😎', time: '21:05' },
];

const FEATURES = [
  { icon: Lock, title: 'Секретные чаты', text: 'ECDH + AES-GCM, таймер удаления' },
  { icon: KeyRound, title: 'Облачный пароль', text: 'Двухэтапная проверка входа' },
  { icon: MonitorSmartphone, title: 'Активные сеансы', text: 'Контроль всех устройств' },
] as const;

const BrandMark: React.FC<{ size?: 'md' | 'lg'; inverted?: boolean }> = ({ size = 'md', inverted = false }) => (
  <div
    className={`${size === 'lg' ? 'w-[72px] h-[72px]' : 'w-10 h-10'} rounded-full ${inverted ? 'bg-white text-[#2481CC] shadow-black/15' : 'bg-[linear-gradient(135deg,#37AEE2,#1E96C8)] text-white shadow-[#1E96C8]/30'} flex items-center justify-center shadow-lg shrink-0`}
  >
    <Send className={`${size === 'lg' ? 'w-8 h-8' : 'w-[18px] h-[18px]'} -translate-x-px translate-y-px`} />
  </div>
);

/** Faint paper-plane doodle wallpaper used on the brand panel. */
const DoodlePattern: React.FC = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.09] pointer-events-none" aria-hidden>
    <defs>
      <pattern id="auth-doodles" width="120" height="120" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
        <path d="M14 30l22-9-6 22-5-8-11-5z" fill="none" stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="80" cy="22" r="5" fill="none" stroke="white" strokeWidth="1.6" />
        <path d="M66 78h18a6 6 0 016 6v6a6 6 0 01-6 6h-10l-6 5v-5h-2a6 6 0 01-6-6v-6a6 6 0 016-6z" fill="none" stroke="white" strokeWidth="1.6" />
        <rect x="18" y="80" width="14" height="11" rx="2.5" fill="none" stroke="white" strokeWidth="1.6" />
        <path d="M21 80v-3a4 4 0 018 0v3" fill="none" stroke="white" strokeWidth="1.6" />
        <circle cx="104" cy="62" r="2" fill="white" />
        <circle cx="46" cy="58" r="1.6" fill="white" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#auth-doodles)" />
  </svg>
);

const TypingDots: React.FC = () => (
  <span className="inline-flex items-center gap-1 h-4" aria-label="печатает">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-slate-400"
        animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
        transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
      />
    ))}
  </span>
);

/** Self-playing secret-chat demo: messages appear one by one, then loop. */
const ChatPreview: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(reduceMotion ? PREVIEW_MESSAGES.length : 0);

  useEffect(() => {
    if (reduceMotion) return;
    const delay = shown >= PREVIEW_MESSAGES.length ? 4200 : shown === 0 ? 700 : 1500;
    const t = setTimeout(() => setShown((n) => (n >= PREVIEW_MESSAGES.length ? 0 : n + 1)), delay);
    return () => clearTimeout(t);
  }, [shown, reduceMotion]);

  const nextIsPeer = shown < PREVIEW_MESSAGES.length && !PREVIEW_MESSAGES[shown].self;

  return (
    <div className="w-full max-w-[380px] rounded-[22px] overflow-hidden bg-white/10 backdrop-blur-xl ring-1 ring-white/20 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]">
      <div className="flex items-center gap-3 px-4 py-3 bg-white/10 border-b border-white/10">
        <div className="w-9 h-9 rounded-full bg-[linear-gradient(135deg,#FF8A65,#F0506E)] flex items-center justify-center font-semibold text-white">А</div>
        <div className="min-w-0 text-left">
          <div className="flex items-center gap-1.5 text-[14px] font-semibold text-white">
            <Lock className="w-3.5 h-3.5 text-emerald-300" />
            Аня
          </div>
          <div className="text-[12px] text-white/70">{nextIsPeer && shown > 0 ? 'печатает…' : 'в сети'}</div>
        </div>
      </div>

      <div className="relative h-[268px] px-3 py-3 flex flex-col justify-end gap-1.5 bg-[linear-gradient(160deg,#A8D5A2_0%,#8FC1B5_45%,#7FA8C9_100%)] dark:bg-[linear-gradient(160deg,#1F3448_0%,#182A3B_50%,#0F1D2B_100%)]">
        <div className="self-center mb-auto mt-1 px-2.5 py-0.5 rounded-full bg-black/20 text-[11px] text-white/90 flex items-center gap-1">
          <Lock className="w-3 h-3" /> Секретный чат
        </div>
        <AnimatePresence initial={false}>
          {PREVIEW_MESSAGES.slice(0, shown).map((m, i) => (
            <motion.div
              key={`${i}-${m.text}`}
              layout
              initial={{ opacity: 0, y: 14, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={SPRING}
              style={{ transformOrigin: m.self ? '100% 100%' : '0% 100%' }}
              className={`relative max-w-[82%] px-3 pt-1.5 pb-1 text-[13.5px] leading-snug shadow-[0_1px_1px_rgba(16,35,47,0.12)] ${
                m.self
                  ? 'self-end mr-1.5 rounded-[16px] rounded-br-none bg-[var(--tg-bubble-self-bg)] text-slate-900 dark:text-white'
                  : 'self-start ml-1.5 rounded-[16px] rounded-bl-none bg-[var(--tg-bubble-peer-bg)] text-slate-900 dark:text-white'
              }`}
            >
              <span>{m.text}</span>
              <span className={`float-right ml-2 mt-1.5 text-[10.5px] leading-none ${m.self ? 'text-emerald-600 dark:text-sky-300' : 'text-slate-400'}`}>
                {m.time}
                {m.self && ' ✓✓'}
              </span>
              <BubbleTail isSelf={m.self} />
            </motion.div>
          ))}
          {nextIsPeer && shown > 0 && (
            <motion.div
              key="typing"
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={SPRING}
              className="self-start ml-1.5 relative px-3 py-2 rounded-[16px] rounded-bl-none bg-[var(--tg-bubble-peer-bg)]"
            >
              <TypingDots />
              <BubbleTail isSelf={false} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export interface AuthLayoutProps {
  darkMode: boolean;
  toggleDarkMode?: () => void;
  /** Shows a back arrow in the top-left corner of the form column. */
  onBack?: () => void;
  backLabel?: string;
  /** Compact logo above the form on screens without the brand panel. */
  showMobileLogo?: boolean;
  children: React.ReactNode;
}

/**
 * Shared shell for sign-in and registration: brand panel with a live
 * secret-chat preview on desktop (lg+), plain Telegram-style form surface on
 * the right / full-screen on mobile.
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({
  darkMode,
  toggleDarkMode,
  onBack,
  backLabel = 'Назад',
  showMobileLogo = true,
  children,
}) => (
  <div className="h-full min-h-full w-full flex bg-white dark:bg-[#17212B] text-slate-900 dark:text-white font-body select-none overflow-hidden">
    {/* Brand panel */}
    <aside className="hidden lg:flex relative w-[46%] xl:w-1/2 shrink-0 flex-col overflow-hidden text-white bg-[linear-gradient(150deg,#3A9FEA_0%,#2481CC_55%,#1A5DA3_100%)] dark:bg-[linear-gradient(150deg,#1D3247_0%,#142435_55%,#0E1621_100%)]">
      <DoodlePattern />
      <div className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full bg-white/15 dark:bg-[#3390EC]/20 blur-[90px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-24 w-[380px] h-[380px] rounded-full bg-[#7FD3FF]/20 dark:bg-[#2AABEE]/10 blur-[90px] pointer-events-none" />

      <div className="relative z-10 flex items-center gap-3 px-10 pt-9">
        <BrandMark inverted />
        <span className="text-[19px] font-heading font-bold tracking-tight">Comms</span>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-8 px-10 py-8">
        <div className="text-center max-w-[420px]">
          <h2 className="text-[30px] xl:text-[34px] leading-[1.15] font-heading font-bold tracking-tight">
            Переписка, которая остаётся между вами
          </h2>
          <p className="mt-3 text-[15px] text-white/80">Быстрый мессенджер в духе Telegram с шифрованием и контролем каждого входа.</p>
        </div>
        <ChatPreview />
      </div>

      <ul className="relative z-10 grid grid-cols-3 gap-3 px-10 pb-9">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-md px-3.5 py-3">
            <Icon className="w-[18px] h-[18px] text-white mb-2" />
            <div className="text-[13px] font-semibold leading-tight">{title}</div>
            <div className="text-[11.5px] text-white/70 leading-snug mt-0.5">{text}</div>
          </li>
        ))}
      </ul>
    </aside>

    {/* Form column */}
    <main className="relative flex-1 min-w-0 h-full overflow-y-auto flex flex-col">
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top,1rem))] pb-2 bg-white/80 dark:bg-[#17212B]/80 backdrop-blur-md">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            title={backLabel}
            aria-label={backLabel}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-10 h-10" />
        )}
        {toggleDarkMode && <Skiper26ThemeToggle darkMode={darkMode} toggleDarkMode={toggleDarkMode} variant="circle" start="top-right" />}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8 pb-6">
        <div className="w-full max-w-[380px] flex flex-col items-center">
          {showMobileLogo && (
            <div className="lg:hidden mb-6">
              <BrandMark size="lg" />
            </div>
          )}
          {children}
        </div>
      </div>

      <footer className="flex items-center justify-center gap-1.5 px-4 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom,1.25rem))] text-[11.5px] text-slate-400 dark:text-slate-500">
        <ShieldCheck className="w-3.5 h-3.5 text-[#3390EC]" />
        <span>Защищено сквозным шифрованием · Comms Web</span>
      </footer>
    </main>
  </div>
);

export default AuthLayout;
