import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Message, UserId } from '../types';
import { HoverAnimatedEmoji } from './TelegramEmojiPickerModal';
import { fullReactionList, quickReactionStrip, readRecentReactions, rememberReaction } from '../lib/reactions';
import { pluralRu } from '../lib/roles';
import {
  IconCornerUpLeft,
  IconEdit,
  IconTrash,
  IconCopy,
  IconPin,
  IconPinnedOff,
  IconShare3,
  IconCircleCheck,
  IconEye,
  IconChevronDown,
  IconBookmark,
  IconChecks,
} from '@tabler/icons-react';

interface TelegramContextMenuModalProps {
  message: Message;
  x: number;
  y: number;
  isSelf: boolean;
  isPinned?: boolean;
  currentUser: UserId | null;
  /** Drives the "read by" line at the top of the menu. */
  roomKind?: 'direct' | 'group' | 'channel';
  onClose: () => void;
  onReply: (message: Message) => void;
  onPin: (message: Message) => void;
  onCopy: (message: Message) => void;
  onEdit: (message: Message) => void;
  onForward: (message: Message) => void;
  onDelete: (message: Message) => void;
  onSelect: (message: Message) => void;
  onMarkRead: (message: Message) => void;
  onSaveToFavorites?: (message: Message) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  /** Group/channel rights; default to the plain private-chat behaviour. */
  canReply?: boolean;
  canPin?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

/** Below this width the message is lifted out of the feed (Telegram iOS / Android). */
const LIFT_BREAKPOINT = 640;
const GAP = 8;
const EDGE = 12;

type MenuItem = {
  label: string;
  icon: typeof IconCopy;
  run: () => void;
  danger?: boolean;
};

export const TelegramContextMenuModal: React.FC<TelegramContextMenuModalProps> = ({
  message,
  x,
  y,
  isSelf,
  isPinned = false,
  currentUser,
  roomKind,
  onClose,
  onReply,
  onPin,
  onCopy,
  onEdit,
  onForward,
  onDelete,
  onSelect,
  onMarkRead,
  onSaveToFavorites,
  onToggleReaction,
  canReply = true,
  canPin = true,
  canEdit,
  canDelete = true,
}) => {
  const [expanded, setExpanded] = useState(false);
  const strip = useMemo(() => quickReactionStrip(), []);
  const recent = useMemo(() => readRecentReactions().slice(0, 7), []);
  const allReactions = useMemo(() => fullReactionList(), []);
  const mine = useMemo(
    () =>
      new Set(
        Object.entries(message.reactions || {})
          .filter(([, users]) => !!currentUser && users.includes(currentUser))
          .map(([emoji]) => emoji),
      ),
    [message.reactions, currentUser],
  );

  // Phones: the bubble itself is lifted above a blurred feed, reactions above it, menu below.
  const [source] = useState(() => {
    if (typeof window === 'undefined' || window.innerWidth >= LIFT_BREAKPOINT) return null;
    const el = document.getElementById(`msg-${message.id}`)?.querySelector<HTMLElement>('[data-bubble]');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.height === 0 || rect.bottom < 0 || rect.top > window.innerHeight) return null;
    return { el, rect };
  });
  const alignRight = source ? isSelf : isSelf || x > window.innerWidth / 2;

  const probeRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const floatRef = useRef<HTMLDivElement | null>(null);
  const liftRef = useRef<HTMLDivElement | null>(null);
  const cloneHostRef = useRef<HTMLDivElement | null>(null);

  const [floatPos, setFloatPos] = useState<{ top: number; left: number } | null>(null);
  const [lift, setLift] = useState<{ top: number; clip: number | null } | null>(null);

  const readers = (message.readBy || []).filter((u) => u !== currentUser).length;
  const info =
    roomKind === 'channel' && typeof message.views === 'number' && message.views > 0
      ? `${message.views} ${pluralRu(message.views, 'просмотр', 'просмотра', 'просмотров')}`
      : isSelf && readers > 0
        ? roomKind === 'group'
          ? `${readers} ${pluralRu(readers, 'прочитал', 'прочитали', 'прочитали')}`
          : 'Прочитано'
        : null;

  const hasText = !!message.text;
  const canCopy = !!message.text || !!message.poll || !!message.file;
  const items: Array<MenuItem | 'separator'> = [
    ...(canReply ? [{ label: 'Ответить', icon: IconCornerUpLeft, run: () => onReply(message) }] : []),
    ...((canEdit ?? isSelf) && hasText && !message.poll ? [{ label: 'Изменить', icon: IconEdit, run: () => onEdit(message) }] : []),
    ...(canPin ? [{ label: isPinned ? 'Открепить' : 'Закрепить', icon: isPinned ? IconPinnedOff : IconPin, run: () => onPin(message) }] : []),
    ...(canCopy
      ? [{
          label: message.poll ? 'Копировать опрос' : message.file && !message.text ? 'Копировать имя файла' : 'Копировать текст',
          icon: IconCopy,
          run: () => onCopy(message),
        }]
      : []),
    { label: 'Переслать', icon: IconShare3, run: () => onForward(message) },
    ...(onSaveToFavorites ? [{ label: 'В Избранное', icon: IconBookmark, run: () => onSaveToFavorites(message) }] : []),
    { label: 'Выделить', icon: IconCircleCheck, run: () => onSelect(message) },
    ...(!isSelf ? [{ label: 'Отметить прочитанным', icon: IconEye, run: () => onMarkRead(message) }] : []),
    ...(canDelete
      ? (['separator', { label: 'Удалить', icon: IconTrash, run: () => onDelete(message), danger: true }] as const)
      : []),
  ];

  const react = (emoji: string) => {
    try { navigator.vibrate?.(20); } catch { /* unsupported */ }
    if (!mine.has(emoji)) rememberReaction(emoji);
    onToggleReaction(message.id, emoji);
    onClose();
  };

  // Lifted mode: a static copy of the bubble replaces the original while the menu is open.
  useLayoutEffect(() => {
    const host = cloneHostRef.current;
    if (!source || !host) return;
    const clone = source.el.cloneNode(true) as HTMLElement;
    clone.removeAttribute('data-bubble');
    clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    clone.style.width = `${source.rect.width}px`;
    clone.style.margin = '0';
    host.replaceChildren(clone);
    source.el.style.visibility = 'hidden';
    return () => {
      source.el.style.visibility = '';
      host.replaceChildren();
    };
  }, [source]);

  // Lifted mode layout: keep reactions + bubble + menu on screen, shifting the bubble as little as possible.
  useLayoutEffect(() => {
    if (!source) return;
    const probe = probeRef.current ? getComputedStyle(probeRef.current) : null;
    const topLimit = (probe ? parseFloat(probe.paddingTop) || 0 : 0) + EDGE;
    const bottomLimit = window.innerHeight - (probe ? parseFloat(probe.paddingBottom) || 0 : 0) - EDGE;
    const topH = topRef.current?.offsetHeight ?? 0;
    const menuH = menuRef.current?.offsetHeight ?? 0;
    const below = menuH ? GAP + menuH : 0;
    const room = bottomLimit - topLimit - topH - GAP - below;
    const bubbleH = Math.min(source.rect.height, Math.max(72, room));
    let top = Math.max(source.rect.top, topLimit + topH + GAP);
    if (top + bubbleH + below > bottomLimit) top = bottomLimit - below - bubbleH;
    top = Math.max(top, topLimit + topH + GAP);
    // Flush the un-shifted position first so the lift animates.
    void liftRef.current?.offsetHeight;
    setLift({ top, clip: bubbleH < source.rect.height ? bubbleH : null });
  }, [source, expanded]);

  // Floating mode (desktop / tablets): anchor at the cursor, flip upwards near the bottom edge.
  useLayoutEffect(() => {
    if (source) return;
    const el = floatRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = el?.offsetWidth ?? 260;
    const h = el?.offsetHeight ?? 380;
    let left = alignRight ? x - w + 24 : x - 24;
    left = Math.max(EDGE, Math.min(left, vw - w - EDGE));
    const up = y + GAP + h > vh - EDGE;
    const top = up ? Math.max(EDGE, y - h - GAP) : Math.max(EDGE, y + GAP);
    setFloatPos({ top, left });
  }, [source, x, y, alignRight, expanded]);

  // Escape closes; arrows walk the menu like a native one.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const nodes = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
      if (!nodes.length) return;
      e.preventDefault();
      const idx = nodes.indexOf(document.activeElement as HTMLElement);
      const next = idx === -1 ? (e.key === 'ArrowDown' ? 0 : nodes.length - 1) : (idx + (e.key === 'ArrowDown' ? 1 : -1) + nodes.length) % nodes.length;
      nodes[next].focus();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  const side = alignRight ? 'right' : 'left';

  const reactionStrip = (
    <div
      ref={topRef}
      className="ui-sheet tg-ctx-in flex max-w-[calc(100vw-24px)] items-center gap-0.5 rounded-full p-1"
      style={{ transformOrigin: `${side} bottom` }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* py/-my: room for the hover zoom so it never triggers a vertical scroll */}
      <div className="no-scrollbar -my-1 flex min-w-0 items-center gap-0.5 overflow-x-auto overflow-y-hidden py-1">
        {strip.map((emoji, i) => (
          <button
            key={emoji}
            type="button"
            onClick={() => react(emoji)}
            className={`tg-reaction-chip ${mine.has(emoji) ? 'is-active' : ''}`}
            style={{ animationDelay: `${40 + i * 24}ms` }}
            aria-label={`Реакция ${emoji}`}
            aria-pressed={mine.has(emoji)}
          >
            <HoverAnimatedEmoji emoji={emoji} size={28} />
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="ml-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-elevated text-muted transition-colors hover:text-ink cursor-pointer"
        aria-label="Все реакции"
        title="Все реакции"
      >
        <IconChevronDown size={18} />
      </button>
    </div>
  );

  const reactionPanel = (
    <div
      ref={topRef}
      className="ui-sheet tg-ctx-in w-[min(332px,calc(100vw-24px))] overflow-hidden rounded-[22px]"
      style={{ transformOrigin: `${side} top` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="max-h-[min(320px,46dvh)] overflow-y-auto p-2 tg-scrollbar">
        {recent.length > 0 && (
          <>
            <div className="px-1.5 pb-1 pt-0.5 text-[12px] font-semibold text-muted">Недавние</div>
            <div className="mb-1.5 grid grid-cols-7 gap-0.5">
              {recent.map((emoji) => (
                <ReactionCell key={`r-${emoji}`} emoji={emoji} active={mine.has(emoji)} onPick={react} />
              ))}
            </div>
          </>
        )}
        <div className="px-1.5 pb-1 pt-0.5 text-[12px] font-semibold text-muted">Все реакции</div>
        <div className="grid grid-cols-7 gap-0.5">
          {allReactions.map((emoji) => (
            <ReactionCell key={emoji} emoji={emoji} active={mine.has(emoji)} onPick={react} />
          ))}
        </div>
      </div>
    </div>
  );

  const menu = expanded ? null : (
    <div
      ref={menuRef}
      role="menu"
      className="ui-sheet tg-ctx-in flex min-w-[220px] max-w-[min(290px,calc(100vw-24px))] flex-col rounded-2xl p-1.5"
      style={{ transformOrigin: `${side} top`, animationDelay: '30ms' }}
      onClick={(e) => e.stopPropagation()}
    >
      {info && (
        <>
          <div className="flex items-center gap-3 px-2.5 py-1.5 text-[13px] text-muted">
            {roomKind === 'channel' ? <IconEye size={18} stroke={1.7} /> : <IconChecks size={18} stroke={1.7} className="text-tick" />}
            <span className="truncate">{info}</span>
          </div>
          <div className="mx-2 my-1 h-px bg-line" />
        </>
      )}
      {items.map((item, i) =>
        item === 'separator' ? (
          <div key={`sep-${i}`} className="mx-2 my-1 h-px bg-line" />
        ) : (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            data-danger={item.danger ? 'true' : undefined}
            onClick={() => {
              item.run();
              onClose();
            }}
            className="ui-menu-item"
          >
            <item.icon size={19} stroke={1.7} />
            <span className="flex-1 truncate">{item.label}</span>
          </button>
        ),
      )}
    </div>
  );

  const reactions = expanded ? reactionPanel : reactionStrip;
  const sideStyle = (r: DOMRect): React.CSSProperties =>
    alignRight ? { right: Math.max(EDGE, window.innerWidth - r.right) } : { left: Math.max(EDGE, r.left) };

  return createPortal(
    <div
      className="fixed inset-0 z-50 select-none"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {/* Safe-area probe for the lifted layout */}
      <div
        ref={probeRef}
        aria-hidden
        className="pointer-events-none invisible fixed left-0 top-0 w-0"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      />

      <div
        className={`absolute inset-0 animate-backdrop ${
          source ? 'bg-black/20 backdrop-blur-[10px] dark:bg-black/45' : 'bg-black/[0.06] dark:bg-black/25'
        }`}
      />

      {source ? (
        <>
          {/* Lifted bubble */}
          <div
            ref={liftRef}
            aria-hidden
            className="tg-ctx-lift pointer-events-none fixed"
            style={{
              top: source.rect.top,
              ...sideStyle(source.rect),
              transform: `translateY(${lift ? lift.top - source.rect.top : 0}px)`,
            }}
          >
            <div
              ref={cloneHostRef}
              className={lift?.clip ? 'tg-ctx-clip overflow-hidden' : undefined}
              style={lift?.clip ? { maxHeight: lift.clip } : undefined}
            />
          </div>

          {/* Reactions above, actions below */}
          <div
            className="fixed flex"
            style={{
              top: (lift?.top ?? source.rect.top) - GAP,
              transform: 'translateY(-100%)',
              visibility: lift ? 'visible' : 'hidden',
              ...sideStyle(source.rect),
            }}
          >
            {reactions}
          </div>
          {menu && (
            <div
              className="fixed flex"
              style={{
                top: (lift?.top ?? source.rect.top) + (lift?.clip ?? source.rect.height) + GAP,
                visibility: lift ? 'visible' : 'hidden',
                ...sideStyle(source.rect),
              }}
            >
              {menu}
            </div>
          )}
        </>
      ) : (
        <div
          ref={floatRef}
          className={`fixed flex flex-col gap-2 ${alignRight ? 'items-end' : 'items-start'}`}
          style={{
            top: floatPos?.top ?? y,
            left: floatPos?.left ?? x,
            visibility: floatPos ? 'visible' : 'hidden',
          }}
        >
          {reactions}
          {menu}
        </div>
      )}
    </div>,
    document.body,
  );
};

const ReactionCell: React.FC<{ emoji: string; active: boolean; onPick: (emoji: string) => void }> = ({ emoji, active, onPick }) => (
  <button
    type="button"
    onClick={() => onPick(emoji)}
    className={`flex aspect-square items-center justify-center rounded-xl transition-transform hover:scale-110 active:scale-90 cursor-pointer ${
      active ? 'bg-accent-muted' : 'hover:bg-elevated'
    }`}
    aria-label={`Реакция ${emoji}`}
    aria-pressed={active}
  >
    <HoverAnimatedEmoji emoji={emoji} size={30} />
  </button>
);
