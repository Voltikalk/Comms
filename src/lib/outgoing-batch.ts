import { ALBUM_MAX_ITEMS } from './message-grouping';

/** How many attachments the composer holds at once (Telegram: albums of 10, several albums per send). */
export const MAX_PENDING_FILES = 30;

export interface BatchItem<F> {
  file: F;
  /** Caption — only the first message of the batch carries the typed text. */
  text: string;
  /** Shared id for photos / videos that render as one album. */
  albumId?: string;
}

const isMediaKind = (type: string) => type === 'image' || type === 'video';

/**
 * Splits the composer attachments into the messages to send, Telegram-style:
 * photos and videos first, chunked into albums of up to 10 (each chunk of 2+
 * gets its own `albumId`), then every other file as a separate message.
 * The caption goes on the first message, which is how albums show it.
 */
export function planBatchSend<F extends { type: string }>(
  files: readonly F[],
  caption: string,
  newAlbumId: () => string,
  albumSize = ALBUM_MAX_ITEMS,
): BatchItem<F>[] {
  const media = files.filter((f) => isMediaKind(f.type));
  const others = files.filter((f) => !isMediaKind(f.type));
  const items: BatchItem<F>[] = [];

  for (let i = 0; i < media.length; i += albumSize) {
    const chunk = media.slice(i, i + albumSize);
    const albumId = chunk.length > 1 ? newAlbumId() : undefined;
    for (const file of chunk) items.push({ file, text: '', albumId });
  }
  for (const file of others) items.push({ file, text: '' });

  if (items.length > 0) items[0].text = caption;
  return items;
}

/** Composer summary for the attachment strip, e.g. "3 фото, 1 видео" / "2 файла". */
export function describeAttachments(files: readonly { type: string }[]): string {
  const count = (pred: (t: string) => boolean) => files.filter((f) => pred(f.type)).length;
  const photos = count((t) => t === 'image');
  const videos = count((t) => t === 'video');
  const rest = files.length - photos - videos;
  const parts: string[] = [];
  if (photos) parts.push(`${photos} фото`);
  if (videos) parts.push(`${videos} видео`);
  if (rest) parts.push(`${rest} ${pluralFiles(rest)}`);
  return parts.join(', ');
}

function pluralFiles(n: number) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'файл';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'файла';
  return 'файлов';
}

export type AttachmentKind = 'image' | 'audio' | 'video' | 'file' | 'sticker';

/** Attachment kind from MIME type, falling back to the file extension. */
export function detectFileKind(file: { name: string; type: string }): AttachmentKind {
  const name = file.name.toLowerCase();
  const mime = file.type;
  if (name.endsWith('.tgs') || mime === 'application/x-tgsticker' || (mime === 'application/gzip' && name.includes('sticker'))) return 'sticker';
  if (mime.startsWith('image/') || /\.(jpe?g|png|gif|webp|heic)$/.test(name)) return 'image';
  if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac)$/.test(name)) return 'audio';
  if (mime.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv|avi)$/.test(name)) return 'video';
  return 'file';
}
