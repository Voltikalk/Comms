import React, { useEffect } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import {
  IconX,
  IconKeyboard,
  IconSend,
  IconAdjustmentsHorizontal,
  IconArrowsLeftRight
} from '@tabler/icons-react';

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'navigation' | 'chat' | 'app';
}

const SHORTCUTS: ShortcutItem[] = [
  {
    keys: ['Ctrl', 'K'],
    description: 'Палитра команд (Spotlight) и быстрый переход к чатам',
    category: 'navigation',
  },
  {
    keys: ['Alt', '↑ / ↓'],
    description: 'Быстрое переключение на предыдущий / следующий чат',
    category: 'navigation',
  },
  {
    keys: ['Alt', '1…5'],
    description: 'Переключение вкладок папок (Все, Личные, Группы, Непрочитанные, Избранное)',
    category: 'navigation',
  },
  {
    keys: ['Ctrl', '1…9'],
    description: 'Мгновенное переключение на чат по номеру 1–9',
    category: 'navigation',
  },
  {
    keys: ['Ctrl', 'F'],
    description: 'Глобальный полнотекстовый поиск по всем сообщениям',
    category: 'navigation',
  },
  {
    keys: ['Esc'],
    description: 'Закрыть модальное окно / Очистить поиск / Выйти из чата',
    category: 'navigation',
  },
  {
    keys: ['Enter'],
    description: 'Отправить набранное сообщение',
    category: 'chat',
  },
  {
    keys: ['Shift', 'Enter'],
    description: 'Перенос строки без отправки',
    category: 'chat',
  },
  {
    keys: ['Ctrl', 'Shift', 'P'],
    description: 'Скрыть выделенный текст под спойлер ||текст||',
    category: 'chat',
  },
  {
    keys: ['Ctrl', 'B / I / U'],
    description: 'Жирный (**текст**), Курсив (*текст*), Подчеркнутый',
    category: 'chat',
  },
  {
    keys: ['Ctrl', 'E'],
    description: 'Открыть палитру эмодзи и .TGS стикеров',
    category: 'chat',
  },
  {
    keys: ['Ctrl', 'N'],
    description: 'Создать новую историю (Stories 2.0)',
    category: 'chat',
  },
  {
    keys: ['Ctrl', ','],
    description: 'Настройки оформления, тем и обоев чата',
    category: 'app',
  },
  {
    keys: ['Ctrl', '/'],
    description: 'Открыть эту справку по горячим клавишам',
    category: 'app',
  },
  {
    keys: ['F11'],
    description: 'Полноэкранный режим приложения',
    category: 'app',
  },
];

export const KeyboardShortcutsModal: React.FC = () => {
  const { showShortcutsModal, setShowShortcutsModal, triggerHaptic } = usePlatform();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showShortcutsModal) {
        e.preventDefault();
        setShowShortcutsModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showShortcutsModal, setShowShortcutsModal]);

  if (!showShortcutsModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-backdrop">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#17212b] rounded-2xl shadow-2xl border border-gray-200/80 dark:border-[#202b36] overflow-hidden flex flex-col max-h-[85vh] animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-[#202b36] flex items-center justify-between bg-gray-50/70 dark:bg-[#101921]/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3390ec]/15 dark:bg-[#3390ec]/25 flex items-center justify-center text-[#3390ec]">
              <IconKeyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Горячие клавиши (Desktop Shortcuts)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Быстрое управление Comms на ПК и ноутбуках
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('selection');
              setShowShortcutsModal(false);
            }}
            className="p-1.5 rounded-full hover:bg-gray-200/80 dark:hover:bg-[#202b36] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Navigation Section */}
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">
              <IconArrowsLeftRight className="w-3.5 h-3.5 text-[#3390ec]" />
              <span>Навигация и поиск</span>
            </div>
            <div className="space-y-2">
              {SHORTCUTS.filter((s) => s.category === 'navigation').map((shortcut, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-[#202b36]/60 border border-gray-100 dark:border-[#2b3947]/40"
                >
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {shortcut.description}
                  </span>
                  <div className="flex items-center space-x-1 shrink-0 ml-3">
                    {shortcut.keys.map((k, kIdx) => (
                      <kbd
                        key={kIdx}
                        className="px-2 py-1 text-[11px] font-mono font-medium rounded-md bg-white dark:bg-[#17212b] border border-gray-200 dark:border-[#2b3947] text-gray-800 dark:text-gray-200 shadow-xs"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Section */}
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">
              <IconSend className="w-3.5 h-3.5 text-emerald-500" />
              <span>Чат и сообщения</span>
            </div>
            <div className="space-y-2">
              {SHORTCUTS.filter((s) => s.category === 'chat').map((shortcut, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-[#202b36]/60 border border-gray-100 dark:border-[#2b3947]/40"
                >
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {shortcut.description}
                  </span>
                  <div className="flex items-center space-x-1 shrink-0 ml-3">
                    {shortcut.keys.map((k, kIdx) => (
                      <kbd
                        key={kIdx}
                        className="px-2 py-1 text-[11px] font-mono font-medium rounded-md bg-white dark:bg-[#17212b] border border-gray-200 dark:border-[#2b3947] text-gray-800 dark:text-gray-200 shadow-xs"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* App Section */}
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">
              <IconAdjustmentsHorizontal className="w-3.5 h-3.5 text-purple-500" />
              <span>Интерфейс и приложение</span>
            </div>
            <div className="space-y-2">
              {SHORTCUTS.filter((s) => s.category === 'app').map((shortcut, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-[#202b36]/60 border border-gray-100 dark:border-[#2b3947]/40"
                >
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {shortcut.description}
                  </span>
                  <div className="flex items-center space-x-1 shrink-0 ml-3">
                    {shortcut.keys.map((k, kIdx) => (
                      <kbd
                        key={kIdx}
                        className="px-2 py-1 text-[11px] font-mono font-medium rounded-md bg-white dark:bg-[#17212b] border border-gray-200 dark:border-[#2b3947] text-gray-800 dark:text-gray-200 shadow-xs"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-[#202b36] bg-gray-50/50 dark:bg-[#101921]/40 flex justify-end">
          <button
            onClick={() => {
              triggerHaptic('selection');
              setShowShortcutsModal(false);
            }}
            className="px-4 py-1.5 rounded-lg bg-[#3390ec] hover:bg-[#2678ca] text-white text-xs font-medium transition-colors"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
};
