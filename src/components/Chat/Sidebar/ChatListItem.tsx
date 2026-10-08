import React from 'react';
import {
  IconBookmark,
  IconChartBar,
  IconCheck,
  IconChecks,
  IconClock,
  IconFileText,
  IconLock,
  IconMicrophone,
  IconPhoto,
  IconPinnedFilled,
  IconSpeakerphone,
  IconUsers,
  IconVideo,
  IconVolumeOff,
} from '@tabler/icons-react';

/** Last-message summary shown under the chat name. */
export interface ChatPreview {
  text: string;
  time: string;
  isMine: boolean;
  isDraft: boolean;
  /** Delivery state of my last message; `null` for incoming / saved messages. */
  status: 'pending' | 'sent' | 'read' | null;
  /** «Вы» / sender name in groups, like Telegram's "Аня: привет". */
  senderLabel: string | null;
  mediaIcon: 'photo' | 'video' | 'voice' | 'file' | 'poll' | null;
}

export interface ChatListItemProps {
  name: string;
  avatarUrl?: string;
  avatarColor: string;
  kind: 'direct' | 'group' | 'channel' | 'saved';
  statusEmoji?: string;
  isSecret?: boolean;
  online: boolean;
  active: boolean;
  compact: boolean;
  muted: boolean;
  pinned: boolean;
  unread: number;
  preview: ChatPreview | null;
  typers: string[];
  onClick: () => void;
  onContextMenu: (x: number, y: number) => void;
}

const MEDIA_ICONS = {
  photo: IconPhoto,
  video: IconVideo,
  voice: IconMicrophone,
  file: IconFileText,
  poll: IconChartBar,
} as const;

const LONG_PRESS_MS = 480;

export const ChatListItem: React.FC<ChatListItemProps> = ({
  name,
  avatarUrl,
  avatarColor,
  kind,
  statusEmoji,
  isSecret,
  online,
  active,
  compact,
  muted,
  pinned,
  unread,
  preview,
  typers,
  onClick,
  onContextMenu,
}) => {
  const press = React.useRef<{ timer: number; x: number; y: number; fired: boolean } | null>(null);

  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
  };
  React.useEffect(() => cancelPress, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    const { clientX: x, clientY: y } = e;
    const state = { x, y, fired: false, timer: 0 };
    state.timer = window.setTimeout(() => {
      state.fired = true;
      navigator.vibrate?.(12);
      onContextMenu(x, y);
    }, LONG_PRESS_MS);
    press.current = state;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const p = press.current;
    if (p && !p.fired && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) cancelPress();
  };

  const badge = unread > 99 ? '99+' : String(unread);
  const MediaIcon = preview?.mediaIcon ? MEDIA_ICONS[preview.mediaIcon] : null;

  const avatar = (
    <span className="relative shrink-0">
      <span
        className={`flex h-[54px] w-[54px] items-center justify-center overflow-hidden rounded-full text-[21px] font-semibold text-white ${
          avatarUrl ? 'bg-elevated' : kind === 'saved' ? 'bg-accent' : avatarColor
        }`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : kind === 'saved' ? (
          <IconBookmark size={26} stroke={1.9} />
        ) : kind === 'group' ? (
          <IconUsers size={25} stroke={1.9} />
        ) : kind === 'channel' ? (
          <IconSpeakerphone size={25} stroke={1.9} />
        ) : (
          (name.trim().charAt(0) || '?').toUpperCase()
        )}
      </span>
      {kind === 'direct' && online && (
        <span
          className={`absolute bottom-[1px] right-[1px] h-[14px] w-[14px] rounded-full border-[2.5px] bg-emerald-500 ${
            active ? 'border-accent' : 'border-surface'
          }`}
        />
      )}
      {compact && unread > 0 && (
        <span
          className={`absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums text-white ring-2 ring-surface ${
            muted ? 'bg-muted' : 'bg-accent'
          }`}
        >
          {badge}
        </span>
      )}
    </span>
  );

  const subtle = active ? 'text-white/75' : 'text-muted';

  return (
    <button
      type="button"
      onClick={() => {
        if (press.current?.fired) {
          press.current = null;
          return;
        }
        onClick();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        cancelPress();
        onContextMenu(e.clientX, e.clientY);
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
      title={compact ? name : undefined}
      aria-current={active ? 'true' : undefined}
      className={`group flex w-full select-none items-center gap-3 rounded-xl text-left transition-colors duration-100 cursor-pointer [-webkit-touch-callout:none] ${
        compact ? 'justify-center p-1.5' : 'h-[72px] px-2.5'
      } ${active ? 'bg-accent text-white' : 'hover:bg-elevated active:bg-elevated'}`}
    >
      {avatar}

      {!compact && (
        <span className="flex min-w-0 flex-1 flex-col justify-center gap-[3px]">
          {/* Line 1: name · status · time */}
          <span className="flex items-center gap-1.5">
            <span className={`flex min-w-0 flex-1 items-center gap-1 text-[15.5px] font-semibold leading-tight ${active ? 'text-white' : 'text-ink'}`}>
              {isSecret && <IconLock size={15} stroke={2.4} className={`shrink-0 ${active ? 'text-white' : 'text-emerald-500'}`} aria-label="Секретный чат" />}
              <span className="truncate">{name}</span>
              {statusEmoji && <span className="shrink-0 text-[14px] leading-none">{statusEmoji}</span>}
              {muted && <IconVolumeOff size={15} className={`shrink-0 ${subtle}`} aria-label="Без звука" />}
            </span>
            {preview?.status && !preview.isDraft && (
              <span className={`shrink-0 ${active ? 'text-white' : preview.status === 'read' ? 'text-accent' : 'text-muted'}`}>
                {preview.status === 'pending' ? (
                  <IconClock size={14} aria-label="Отправляется" />
                ) : preview.status === 'read' ? (
                  <IconChecks size={17} aria-label="Прочитано" />
                ) : (
                  <IconCheck size={17} aria-label="Отправлено" />
                )}
              </span>
            )}
            {preview?.time && <span className={`shrink-0 text-[12.5px] tabular-nums ${subtle}`}>{preview.time}</span>}
          </span>

          {/* Line 2: preview · badge/pin */}
          <span className="flex items-center gap-2">
            <span className={`min-w-0 flex-1 truncate text-[14.5px] leading-snug ${subtle}`}>
              {typers.length > 0 ? (
                <span className={active ? 'text-white' : 'text-accent'}>
                  {kind === 'group' ? `${typers.join(', ')} ${typers.length > 1 ? 'печатают' : 'печатает'}…` : 'печатает…'}
                </span>
              ) : !preview ? (
                <span className="opacity-80">Нет сообщений</span>
              ) : (
                <>
                  {preview.isDraft && <span className={active ? 'text-white' : 'text-danger'}>Черновик: </span>}
                  {!preview.isDraft && preview.senderLabel && (
                    <span className={active ? 'text-white' : 'text-ink'}>{preview.senderLabel}: </span>
                  )}
                  {MediaIcon && !preview.isDraft && <MediaIcon size={15} className="mr-0.5 inline-block -translate-y-px align-middle" />}
                  {preview.text}
                </>
              )}
            </span>
            {unread > 0 ? (
              <span
                className={`flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full px-1.5 text-[12.5px] font-semibold tabular-nums ${
                  active ? 'bg-white text-accent' : muted ? 'bg-muted/70 text-white' : 'bg-accent text-white'
                }`}
              >
                {badge}
              </span>
            ) : pinned ? (
              <IconPinnedFilled size={16} className={`shrink-0 rotate-45 ${subtle}`} aria-label="Закреплён" />
            ) : null}
          </span>
        </span>
      )}
    </button>
  );
};

export default ChatListItem;
