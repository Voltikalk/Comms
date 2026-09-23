import React from 'react';

interface TgAvatarProps {
  id?: string;
  name: string;
  src?: string | null;
  size?: number; // pixel size, e.g. 32, 40, 48, 54
  isOnline?: boolean;
  hasUnreadStory?: boolean;
  className?: string;
  onClick?: () => void;
}

// 7 core peer hues or 26 peer color indices for Telegram
const getPeerColorIndex = (idOrName: string): number => {
  if (!idOrName) return 0;
  let hash = 0;
  for (let i = 0; i < idOrName.length; i++) {
    hash = (hash * 31 + idOrName.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash) % 26;
};

// Extract initials (1 or 2 letters)
const getInitials = (name: string): string => {
  if (!name) return '?';
  const clean = name.trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
};

export const TgAvatar: React.FC<TgAvatarProps> = ({
  id,
  name,
  src,
  size = 48,
  isOnline = false,
  hasUnreadStory = false,
  className = '',
  onClick,
}) => {
  const peerIndex = getPeerColorIndex(id || name);
  const initials = getInitials(name);
  const fontSize = Math.max(Math.round(size * 0.4), 12);

  return (
    <div
      onClick={onClick}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`relative flex-shrink-0 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Story Ring if unread story exists */}
      {hasUnreadStory && (
        <div 
          className="absolute -inset-1 rounded-full p-[2px] bg-gradient-to-tr from-[#34c578] to-[#3ca3f3] animate-pulse" 
        />
      )}

      {/* Avatar Surface */}
      <div 
        style={{ width: `${size}px`, height: `${size}px` }}
        className={`rounded-full overflow-hidden flex items-center justify-center font-bold text-white shadow-xs peer-color-${peerIndex} relative`}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // fallback to initials on error
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div 
            style={{ fontSize: `${fontSize}px` }}
            className="w-full h-full flex items-center justify-center font-sans tracking-tight"
            style-color="var(--color-user)"
          >
            {/* Inner gradient applied using peer-color classes from telegram-peer-colors.css */}
            <div 
              className="w-full h-full flex items-center justify-center"
              style={{
                background: `linear-gradient(180deg, rgba(255,255,255,0.2) 0%, var(--accent-color, #3390EC) 100%)`,
                backgroundColor: 'var(--accent-color, #3390EC)',
              }}
            >
              <span>{initials}</span>
            </div>
          </div>
        )}
      </div>

      {/* Online indicator dot */}
      {isOnline && (
        <span 
          style={{ width: Math.max(Math.round(size * 0.26), 9), height: Math.max(Math.round(size * 0.26), 9) }}
          className="absolute bottom-0 right-0 rounded-full bg-[#00c73e] ring-2 ring-white dark:ring-[#17212b]"
          title="В сети"
        />
      )}
    </div>
  );
};

export default TgAvatar;
