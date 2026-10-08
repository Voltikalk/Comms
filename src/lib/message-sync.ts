/**
 * Pure helpers that keep the client message list in sync with the server:
 * normalisation of incoming messages, merging history with local optimistic
 * bubbles and reconciling server echoes / acks with the offline queue.
 */
import type { Message, UserId } from '../types';

const FWD_MARKER = /^\u200B\u200B\[fwd:([^\]]+)\]\u200B\u200B/;
const STICKER_NAME_HINTS = ['уточка', 'вишенка', 'stonks', 'бокс', 'пепе', 'колобок'];

/** Zero-width forward marker: survives transports that drop `forwardedFrom`. */
export function encodeForwardMarker(sender: UserId, senderName: string): string {
  return `\u200B\u200B[fwd:${JSON.stringify({ s: sender, n: senderName })}]\u200B\u200B`;
}

export function stripForwardMarker(text: string): string {
  return text.replace(FWD_MARKER, '').replace(/^\[Переслано от [^\]]+\]:\s*/, '');
}

function isStickerFile(file: NonNullable<Message['file']>): boolean {
  const name = (file.name || '').toLowerCase();
  const data = (file.data || '').toLowerCase();
  return (
    file.type === 'sticker' ||
    name.startsWith('sticker_') ||
    name.endsWith('.tgs') ||
    data.endsWith('.tgs') ||
    data.includes('/stickers/') ||
    data.startsWith('data:image/svg+xml') ||
    STICKER_NAME_HINTS.some((hint) => name.includes(hint))
  );
}

/** Restores forward metadata, sticker type and absolute upload URLs. */
export function sanitizeMessage(msg: Message, serverUrl = ''): Message {
  let forwardedFrom = msg.forwardedFrom;
  if (!forwardedFrom && msg.text) {
    const match = msg.text.match(FWD_MARKER);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]) as { s: UserId; n?: string };
        forwardedFrom = { sender: parsed.s, senderName: parsed.n || parsed.s };
      } catch {
        // malformed marker — keep the raw text
      }
    }
  }
  if (!msg.file) return { ...msg, forwardedFrom };
  return {
    ...msg,
    forwardedFrom,
    file: {
      ...msg.file,
      type: isStickerFile(msg.file) ? 'sticker' : msg.file.type,
      isUploading: false,
      uploadProgress: undefined,
      data: msg.file.data?.startsWith('/uploads/') ? `${serverUrl}${msg.file.data}` : msg.file.data,
    },
  };
}

/** Drops empty rows. E2EE messages have an empty `text` but carry ciphertext; service messages carry an event. */
export function isMeaningfulMessage(m: Message): boolean {
  return Boolean((m.text && m.text.trim().length > 0) || m.file || m.forwardedFrom || m.poll || m.sticker || m.encrypted || m.service);
}

const sameMessage = (a: Message, b: Message) => a.id === b.id || Boolean(a.clientId && a.clientId === b.clientId);

/**
 * Plaintext of our own E2EE message is known locally; keep it when the server
 * echo (ciphertext only) replaces the optimistic bubble.
 */
function keepLocalPlaintext(incoming: Message, existing: Message | undefined): Message {
  if (!existing || !incoming.encrypted || incoming.text || !existing.text) return incoming;
  if (existing.encrypted && existing.encrypted.ct !== incoming.encrypted.ct) return incoming;
  return { ...incoming, text: existing.text };
}

/**
 * Server history replaces the list, but optimistic bubbles (pending / queued)
 * that the server has not seen yet stay at the end.
 */
export function mergeHistory(history: Message[], local: Message[]): Message[] {
  const merged = history.map((h) => keepLocalPlaintext(h, local.find((l) => sameMessage(l, h))));
  const leftovers = local.filter((l) => (l.pending || l.queued) && !history.some((h) => sameMessage(l, h)));
  return [...merged, ...leftovers];
}

/** Applies a `receive_message` event. `isNew` is false for echoes of our own optimistic bubbles. */
export function upsertIncoming(prev: Message[], incoming: Message): { next: Message[]; isNew: boolean } {
  const index = prev.findIndex((m) => sameMessage(m, incoming));
  if (index === -1) return { next: [...prev, incoming], isNew: true };
  const next = prev.slice();
  next[index] = { ...keepLocalPlaintext(incoming, prev[index]), pending: false, queued: false };
  return { next, isNew: false };
}

/** Applies a positive `send_message` ack to the optimistic bubble identified by `clientId`. */
export function applySendAck(prev: Message[], clientId: string, id: string, now = Date.now()): Message[] {
  return prev.map((m) => {
    if (m.clientId !== clientId && m.id !== clientId) return m;
    return {
      ...m,
      id,
      pending: false,
      queued: false,
      expiresAt: m.ttl ? (m.expiresAt ?? now + m.ttl * 1000) : m.expiresAt,
    };
  });
}

/** Removes duplicates that may appear when an ack and the server echo race. */
export function dedupeMessages(list: Message[]): Message[] {
  const seen = new Set<string>();
  return list.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

export function countUnread(list: Message[], roomId: string, user: UserId): number {
  return list.filter((m) => m.roomId === roomId && m.sender !== user && !m.pending && !m.readBy?.includes(user)).length;
}

export function unreadIds(list: Message[], roomId: string, user: UserId): string[] {
  return list
    .filter((m) => m.roomId === roomId && m.sender !== user && !m.pending && !m.readBy?.includes(user))
    .map((m) => m.id);
}

/** Optimistic poll vote: replaces the user's previous choice. */
export function applyPollVote(m: Message, user: UserId, optionIds: string[]): Message {
  if (!m.poll || m.poll.closed) return m;
  const votes: Record<string, UserId[]> = {};
  for (const [optId, voters] of Object.entries(m.poll.votes || {})) {
    const kept = voters.filter((v) => v !== user);
    if (kept.length > 0) votes[optId] = kept;
  }
  for (const optId of optionIds) votes[optId] = [...(votes[optId] ?? []), user];
  return { ...m, poll: { ...m.poll, votes } };
}
