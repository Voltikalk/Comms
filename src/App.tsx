import React, { useState, useEffect } from 'react';
import { PlatformProvider } from './context/PlatformContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { StoriesProvider } from './context/StoriesContext';
import { LoginScreen } from './components/LoginScreen';
import { ChatScreen } from './components/ChatScreen';
import { KeyboardShortcutsModal } from './components/Desktop/KeyboardShortcutsModal';
import { AppInstallModal } from './components/Hybrid/AppInstallModal';

const AppContent: React.FC = () => {
  const { currentUser } = useSocket();
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
      // ignore
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

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
