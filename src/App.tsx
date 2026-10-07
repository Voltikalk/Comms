import React, { useState, useEffect } from 'react';
import { PlatformProvider } from './context/PlatformContext';
import { SocketProvider } from './context/SocketContext';
import { useAuth } from './context/contexts';
import { StoriesProvider } from './context/StoriesContext';
import { LoginScreen } from './components/LoginScreen';
import { ChatScreen } from './components/ChatScreen';
import { KeyboardShortcutsModal } from './components/Desktop/KeyboardShortcutsModal';
import { AppInstallModal } from './components/Hybrid/AppInstallModal';

const AppContent: React.FC = () => {
  const { currentUser, status } = useAuth();
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('chat_dark_mode');
      if (saved !== null) return saved === 'true';
    } catch {
      // ignore
    }
    return true;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    try {
      localStorage.setItem('chat_dark_mode', String(darkMode));
    } catch {

    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  // Silent refresh via the HttpOnly cookie is in flight — avoid flashing the login form.
  if (status === 'restoring') {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-4 auth-canvas" role="status" aria-live="polite">
        <div className="w-16 h-16 rounded-full bg-[#3390EC] flex items-center justify-center shadow-lg shadow-[#3390EC]/30 animate-pulse">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="currentColor" aria-hidden="true">
            <path d="M21.4 4.2 2.9 11.3c-1.3.5-1.3 1.2-.2 1.6l4.7 1.5 1.8 5.6c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.7c.3-1.3-.5-1.9-1.5-1.4Z" />
          </svg>
        </div>
        <span className="text-[13px] text-slate-500 dark:text-slate-400">Восстановление сеанса…</span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LoginScreen darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        <KeyboardShortcutsModal />
        <AppInstallModal />
      </>
    );
  }

  return (
    <StoriesProvider>
      <ChatScreen darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      <KeyboardShortcutsModal />
      <AppInstallModal />
    </StoriesProvider>
  );
};

const App: React.FC = () => {
  return (
    <PlatformProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </PlatformProvider>
  );
};

export default App;
