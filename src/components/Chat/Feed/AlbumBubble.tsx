import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { IconCheck, IconPlayerPlayFilled } from '@tabler/icons-react';
import type { Message, UserId } from '../../../types';
import { getAlbumLayout, getAlbumTileRadius, getBubbleCorners } from '../../../lib/message-grouping';
import { MessageMeta, type MetaDeliveryStatus } from './MessageMeta';
import { BubbleTail } from './BubbleTail';

const SPRING = { type: 'spring', stiffness: 400, damping: 28 } as const;
/** Inner tile radius: bubble radius minus the 3px collage padding. */
const TILE_RADIUS = 15;

export interface AlbumBubbleProps {
  items: Message[];
  isSelf: boolean;
  senderName: string;
  showSenderLabel: boolean;
  groupedAbove: boolean;
  groupedBelow: boolean;
  currentUser: UserId | null;
  isSelectMode: boolean;
  selectedMessageIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpenGallery: (messageId: string) => void;
  onOpenContextMenu: (message: Message, pos: { x: number; y: number }) => void;
}

const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** Album caption: first item text that is not just the auto-generated file name. */
const albumCaption = (items: Message[]) =>
  items
    .map((m) => m.text.trim())
    .find((t, i) => t && t !== items[i].file?.name && !t.startsWith('📎')) ?? '';

/**
 * Bento collage for 2–10 photos / videos sent together. Layout comes from
 * `getAlbumLayout`; outer tile corners follow the cluster radii so the whole
 * collage reads as one bubble (with the tail on the last bubble of a run).
 */
export const AlbumBubble: React.FC<AlbumBubbleProps> = ({
  items,
  isSelf,
  senderName,
  showSenderLabel,
  groupedAbove,
  groupedBelow,
  currentUser,
  isSelectMode,
  selectedMessageIds,
  onToggleSelect,
  onOpenGallery,
  onOpenContextMenu,
}) => {
  const layout = useMemo(() => getAlbumLayout(items.length), [items.length]);
  const last = items[items.length - 1];
  const caption = albumCaption(items);
  const corners = getBubbleCorners(isSelf, groupedAbove, groupedBelow);
  const radius = `${corners.topLeft}px ${corners.topRight}px ${corners.bottomRight}px ${corners.bottomLeft}px`;
  const allSelected = items.every((m) => selectedMessageIds.has(m.id));

  const readersCount = (last.readBy || []).filter((u) => u !== currentUser).length;
  const deliveryStatus: MetaDeliveryStatus = last.queued
    ? 'queued'
    : last.pending || last.file?.isUploading
      ? 'pending'
      : readersCount > 0
        ? 'read'
        : 'sent';

  const toggleAll = () => {
    for (const m of items) {
      if (selectedMessageIds.has(m.id) === allSelected) onToggleSelect(m.id);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SPRING}
      onClick={() => isSelectMode && toggleAll()}
      className={`w-full ${groupedAbove ? 'pt-px' : 'pt-1'} ${groupedBelow ? 'pb-px' : 'pb-1'} px-1.5 sm:px-2 relative rounded-xl ${
        isSelectMode ? 'cursor-pointer' : ''
      } ${allSelected && isSelectMode ? 'tg-message-row-selected' : ''}`}
    >
      <div className={`flex items-end gap-2 w-full min-w-0 ${isSelf ? 'justify-end' : 'justify-start'}`}>
        {isSelectMode && (
          <span
            aria-hidden
            className={`mr-2.5 mb-1.5 w-5.5 h-5.5 shrink-0 rounded-full flex items-center justify-center ${
              allSelected ? 'bg-[#3390ec] text-white' : 'border-2 border-slate-400 dark:border-white/40'
            }`}
          >
            {allSelected && <IconCheck size={14} stroke={3} />}
          </span>
        )}
        {!isSelf &&
          (showSenderLabel ? (
            <div
              className="w-8 h-8 rounded-full bg-[#3390ec] text-white flex items-center justify-center text-xs font-bold shrink-0 mr-1.5 mb-0.5 select-none"
              title={senderName}
            >
              {senderName.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div className="w-8 shrink-0 mr-1.5" />
          ))}

        <div
          data-bubble="true"
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenContextMenu(last, { x: e.clientX, y: e.clientY });
          }}
          className={`${isSelf ? 'tg-bubble-self' : 'tg-bubble-peer'} relative p-[3px] max-w-[85%] sm:max-w-[75%] select-none`}
          style={{ borderRadius: radius }}
        >
          {!isSelf && showSenderLabel && <div className="px-2 pt-0.5 pb-1 text-[12px] font-bold text-[#3390ec]">{senderName}</div>}

          <div className="tg-album" role="group" aria-label={`Альбом: ${items.length}`}>
            {items.map((m, i) => {
              const cell = layout.cells[i];
              const [tl, tr, br, bl] = getAlbumTileRadius(layout, i, TILE_RADIUS).split(' ');
              // With a caption below the collage, the bottom row keeps tight corners.
              const tileRadius = caption ? `${tl} ${tr} 2px 2px` : `${tl} ${tr} ${br} ${bl}`;
              return (
                <button
                  type="button"
                  key={m.id}
                  id={`msg-${m.id}`}
                  data-message-id={m.id}
                  className="tg-album-tile"
                  style={{
                    gridColumn: `span ${cell.colSpan}`,
                    gridRow: `span ${cell.rowSpan}`,
                    borderRadius: tileRadius,
                  }}
                  onClick={(e) => {
                    if (isSelectMode) return;
                    e.stopPropagation();
                    onOpenGallery(m.id);
                  }}
                  aria-label={m.file?.type === 'video' ? 'Видео' : 'Фото'}
                >
                  {m.file?.type === 'video' ? (
                    <>
                      <video src={m.file.data} muted playsInline preload="metadata" />
                      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="w-9 h-9 rounded-full bg-black/45 text-white flex items-center justify-center">
                          <IconPlayerPlayFilled size={16} />
                        </span>
                      </span>
                    </>
                  ) : (
                    <img src={m.file?.data} alt={m.file?.name || 'Фото'} loading="lazy" draggable={false} />
                  )}
                  {m.file?.isUploading && (
                    <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[11px] font-semibold">
                      {Math.round(m.file.uploadProgress || 0)}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {caption ? (
            <div className="px-2 pt-1.5 pb-1 text-[14px] leading-snug break-words whitespace-pre-wrap">
              {caption}
              <span className="float-right ml-2 mt-1.5 inline-flex items-center gap-0.5 text-[11px] opacity-60">
                <MessageMeta message={last} isSelf={isSelf} deliveryStatus={deliveryStatus} formatTime={formatTime} />
              </span>
            </div>
          ) : (
            <span className="absolute right-2 bottom-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/45 text-white text-[11px]">
              <MessageMeta message={last} isSelf={isSelf} deliveryStatus={deliveryStatus} formatTime={formatTime} />
            </span>
          )}

          {corners.showTail && <BubbleTail isSelf={isSelf} />}
        </div>
      </div>
    </motion.div>
  );
};

export default AlbumBubble;
