import React from 'react';
import {
  IconBold,
  IconItalic,
  IconUnderline,
  IconStrikethrough,
  IconCode,
  IconSparkles,
  IconLink,
  IconX,
} from '@tabler/icons-react';

export interface FormattingToolbarProps {
  isVisible: boolean;
  position: { top: number; left: number };
  onApplyFormat: (tagOpen: string, tagClose: string) => void;
  onClose?: () => void;
}

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({
  isVisible,
  position,
  onApplyFormat,
  onClose,
}) => {
  if (!isVisible) return null;

  const actions = [
    {
      id: 'bold',
      label: 'Жирный',
      shortcut: 'Ctrl+B',
      icon: <IconBold size={15} stroke={2.6} />,
      tagOpen: '**',
      tagClose: '**',
    },
    {
      id: 'italic',
      label: 'Курсив',
      shortcut: 'Ctrl+I',
      icon: <IconItalic size={15} stroke={2.4} />,
      tagOpen: '*',
      tagClose: '*',
    },
    {
      id: 'underline',
      label: 'Подчёркнутый',
      shortcut: 'Ctrl+U',
      icon: <IconUnderline size={15} stroke={2.4} />,
      tagOpen: '__',
      tagClose: '__',
    },
    {
      id: 'strikethrough',
      label: 'Зачёркнутый',
      shortcut: 'Ctrl+Shift+X',
      icon: <IconStrikethrough size={15} stroke={2.4} />,
      tagOpen: '~~',
      tagClose: '~~',
    },
    {
      id: 'monospace',
      label: 'Моноширинный',
      shortcut: 'Ctrl+Shift+M',
      icon: <IconCode size={15} stroke={2.4} />,
      tagOpen: '`',
      tagClose: '`',
    },
  ];

  return (
    <div
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className="fixed z-50 -translate-x-1/2 -translate-y-full mb-3 select-none pointer-events-auto animate-pop-in"
      onMouseDown={(e) => {
        // Prevent losing focus on textarea when clicking toolbar buttons
        e.preventDefault();
      }}
    >
      {/* Floating HUD Bubble */}
      <div className="relative flex items-center gap-1 px-1.5 py-1 rounded-2xl bg-white/95 dark:bg-[#1e2936]/95 backdrop-blur-xl text-slate-800 dark:text-white shadow-[0_12px_36px_rgba(0,0,0,0.28)] border border-slate-200/90 dark:border-white/10 ring-1 ring-black/5 dark:ring-white/5">
        
        {/* Core Formatting Group */}
        <div className="flex items-center gap-0.5">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onApplyFormat(action.tagOpen, action.tagClose);
              }}
              className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center cursor-pointer text-slate-700 dark:text-slate-200 hover:text-[#3390ec] dark:hover:text-[#6ab3f3]"
              title={`${action.label} (${action.shortcut})`}
            >
              {action.icon}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-[1px] h-5 bg-slate-200 dark:bg-white/10 mx-0.5" />

        {/* Special Action: Telegram Spoiler Button */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onApplyFormat('||', '||');
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#3390ec]/15 to-[#ac8bdd]/15 hover:from-[#3390ec]/25 hover:to-[#ac8bdd]/25 text-[#3390ec] dark:text-[#6ab3f3] font-semibold text-xs active:scale-95 transition-all cursor-pointer shadow-xs border border-[#3390ec]/20"
          title="Скрыть под спойлер (Ctrl+Shift+P)"
        >
          <IconSparkles size={14} className="text-[#3390ec] dark:text-[#6ab3f3] shrink-0" />
          <span className="leading-none text-[12px] tracking-wide">Спойлер</span>
        </button>

        {/* Special Action: Link */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const url = window.prompt('Введите URL ссылки:', 'https://');
            if (url && url.trim()) {
              onApplyFormat('', ` (${url.trim()})`);
            }
          }}
          className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center cursor-pointer text-slate-700 dark:text-slate-200 hover:text-[#3390ec] dark:hover:text-[#6ab3f3]"
          title="Добавить ссылку"
        >
          <IconLink size={15} stroke={2.4} />
        </button>

        {/* Optional Dismiss */}
        {onClose && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="w-7 h-7 rounded-xl hover:bg-rose-500/10 active:scale-95 transition-all flex items-center justify-center cursor-pointer text-slate-400 hover:text-rose-500 ml-0.5"
            title="Закрыть"
          >
            <IconX size={14} />
          </button>
        )}

        {/* Downward pointing triangle arrow */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-white dark:bg-[#1e2936] border-r border-b border-slate-200/90 dark:border-white/10" />
      </div>
    </div>
  );
};
