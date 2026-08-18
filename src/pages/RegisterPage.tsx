import React from 'react';
import { TelegramRegistrationWizard } from '../components/TelegramRegistrationWizard';

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
  return (
    <TelegramRegistrationWizard
      darkMode={darkMode}
      toggleDarkMode={toggleDarkMode}
      onCancel={onNavigateToLogin}
    />
  );
};
