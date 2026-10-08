import React from 'react';
import { IconSearch, IconX } from '@tabler/icons-react';

/** Rounded search field shared by the emoji and sticker panels. */
export const PickerSearch: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}> = ({ value, onChange, placeholder }) => (
  <label className="flex h-9 items-center gap-2 rounded-full bg-ink/[0.06] px-3 text-muted transition-colors focus-within:bg-ink/[0.08] focus-within:text-accent">
    <IconSearch size={17} className="shrink-0" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="min-w-0 flex-1 border-none bg-transparent text-[14px] text-ink placeholder:text-muted focus:outline-none"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted/30 text-surface transition-colors hover:bg-muted/50 cursor-pointer"
        aria-label="Очистить поиск"
      >
        <IconX size={12} stroke={3} />
      </button>
    )}
  </label>
);

/** Icon button in a category / sticker-pack strip. */
export const PickerStripButton: React.FC<{
  active: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, title, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    aria-pressed={active}
    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors cursor-pointer ${
      active ? 'bg-accent-muted text-accent' : 'text-muted hover:bg-ink/[0.06] hover:text-ink'
    }`}
  >
    {children}
  </button>
);

/** Sticky section caption inside a picker feed. */
export const PickerSectionTitle: React.FC<{ children: React.ReactNode; trailing?: React.ReactNode }> = ({ children, trailing }) => (
  <div className="sticky top-0 z-10 flex items-center gap-2 bg-surface/95 px-3 pb-1 pt-2 text-[13px] font-semibold text-muted backdrop-blur-md">
    <span className="min-w-0 flex-1 truncate">{children}</span>
    {trailing}
  </div>
);
