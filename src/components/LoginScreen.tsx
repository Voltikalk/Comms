import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { 
  Lock, 
  Key, 
  Sun, 
  Moon,
  ShieldAlert,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

interface LoginScreenProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const PRESET_ACCOUNTS = [
  { id: 'vlad', name: 'Влад', pass: 'vladpass', color: 'bg-indigo-600' },
  { id: 'anya', name: 'Аня', pass: 'anyapass', color: 'bg-pink-600' },
  { id: 'mom', name: 'Мама', pass: 'mompass', color: 'bg-amber-600' },
  { id: 'dad', name: 'Папа', pass: 'dadpass', color: 'bg-sky-600' },
  { id: 'sister', name: 'Сестра', pass: 'sispass', color: 'bg-emerald-600' }
];

export const LoginScreen: React.FC<LoginScreenProps> = ({ darkMode, toggleDarkMode }) => {
  const [key, setKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const { login, error } = useSocket();

  const handleLoginWithKey = async (authKey: string) => {
    if (!authKey.trim()) return;

    setIsLoading(true);
    setTimeout(async () => {
      const success = await login(authKey);
      setIsLoading(false);
      if (success) {
        setKey('');
      }
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLoginWithKey(key);
  };

  const handleSelectAccount = (account: typeof PRESET_ACCOUNTS[0]) => {
    setSelectedAccountId(account.id);
    setKey(account.pass);
    handleLoginWithKey(account.pass);
  };

  return (
    <div className="min-h-dvh w-full flex flex-col items-center justify-center p-4 sm:p-6 relative bg-slate-100 dark:bg-[#0b0e14] transition-colors duration-200">
      
      {/* Theme Toggle in Header */}
      <div className="absolute top-5 right-5 z-20">
        <button
          type="button"
          onClick={toggleDarkMode}
          className="p-2.5 rounded-xl bg-white dark:bg-[#151b27] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-105 transition-all cursor-pointer shadow-xs"
          aria-label="Toggle theme"
          title={darkMode ? 'Светлая тема' : 'Темная тема'}
        >
          {darkMode ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600" />
          )}
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-[400px] tg-header rounded-3xl p-7 sm:p-8 animate-pop-in relative z-10 shadow-xl border border-slate-200 dark:border-white/10">
        
        {/* App Logo & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#3390ec] text-white shadow-md mb-3.5 relative">
            <Lock className="w-7 h-7" />
            <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#17212b]" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white m-0">
            Telegram
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Безопасный приватный чат
          </p>
        </div>

        {/* Quick Profile Select */}
        <div className="mb-6">
          <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider block mb-2 px-0.5">
            Быстрый вход
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {PRESET_ACCOUNTS.map((acc) => {
              const isSelected = selectedAccountId === acc.id || key === acc.pass;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleSelectAccount(acc)}
                  disabled={isLoading}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 ring-2 ring-indigo-500 scale-105'
                      : 'hover:bg-slate-100 dark:hover:bg-white/5 hover:scale-105'
                  }`}
                  title={`Войти как ${acc.name}`}
                >
                  <div className={`w-9 h-9 rounded-xl ${acc.color} text-white flex items-center justify-center text-xs font-bold shadow-xs`}>
                    {acc.name.charAt(0)}
                  </div>
                  <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate w-full text-center">
                    {acc.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Или пароль
          </span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Key className="w-4 h-4" />
            </div>

            <input
              id="access-key"
              type={showPassword ? 'text' : 'password'}
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setSelectedAccountId(null);
              }}
              placeholder="Введите ключ доступа..."
              disabled={isLoading}
              className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-50 dark:bg-[#0e121a] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all text-center font-mono text-sm disabled:opacity-50"
              required
              autoFocus
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label={showPassword ? 'Скрыть ключ' : 'Показать ключ'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-600 dark:text-rose-400 text-xs text-center flex items-center justify-center gap-2 font-medium">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !key.trim()}
            className="w-full py-3 px-4 rounded-xl tg-btn-primary active:scale-[0.98] font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm shadow-sm transition-all"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Подключение...</span>
              </>
            ) : (
              <>
                <span>Войти</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>v2.0 · WebSocket</span>
          <span className="text-emerald-500 font-semibold">● Сервер активен</span>
        </div>

      </div>
    </div>
  );
};
