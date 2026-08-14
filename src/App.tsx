import React, { useState, useEffect } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import { LoginScreen } from './components/LoginScreen';
import { ChatScreen } from './components/ChatScreen';

const AppContent: React.FC = () => {
  const { currentUser } = useSocket();
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('chat_dark_mode');
    if (saved !== null) return saved === 'true';
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
    localStorage.setItem('chat_dark_mode', String(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  if (!currentUser) {
    return <LoginScreen darkMode={darkMode} toggleDarkMode={toggleDarkMode} />;
  }

  return <ChatScreen darkMode={darkMode} toggleDarkMode={toggleDarkMode} />;
};

const App: React.FC = () => {
  return (
    <SocketProvider>
      <AppContent />
    </SocketProvider>
  );
};

export default App;
