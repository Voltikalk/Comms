import { describe, expect, it } from 'vitest';
import type { Message } from '../types';
import {
  applyPollVote,
  applySendAck,
  countUnread,
  encodeForwardMarker,
  isMeaningfulMessage,
  mergeHistory,
  sanitizeMessage,
  stripForwardMarker,
  unreadIds,
  upsertIncoming,
} from './message-sync';

const msg = (over: Partial<Message>): Message => ({
  id: 'm1',
  roomId: 'r1',
  sender: 'alice',
  text: 'hi',
  timestamp: 1,
  ...over,
});

const envelope = { alg: 'ECDH-P256+AES-GCM-256' as const, iv: 'aXY=', ct: 'Y3Q=', kid: 'a:b' };

describe('message-sync', () => {
  it('restores forward metadata from the zero-width marker', () => {
    const text = `${encodeForwardMarker('bob', 'Боб')}привет`;
    const out = sanitizeMessage(msg({ text }));
    expect(out.forwardedFrom).toEqual({ sender: 'bob', senderName: 'Боб' });
    expect(stripForwardMarker(text)).toBe('привет');
  });

  it('normalises sticker files and relative upload URLs', () => {
    const out = sanitizeMessage(
      msg({ file: { name: 'sticker_cat.tgs', type: 'file', data: '/uploads/x.tgs', size: 1, isUploading: true } }),
      'https://chat.example.test',
    );
    expect(out.file?.type).toBe('sticker');
    expect(out.file?.data).toBe('https://chat.example.test/uploads/x.tgs');
    expect(out.file?.isUploading).toBe(false);
  });

  it('keeps encrypted messages even though their text is empty', () => {
    expect(isMeaningfulMessage(msg({ text: '' }))).toBe(false);
    expect(isMeaningfulMessage(msg({ text: '', encrypted: envelope }))).toBe(true);
  });

  it('history keeps optimistic queued bubbles the server has not seen', () => {
    const history = [msg({ id: 's1', clientId: 'c1' })];
    const local = [
      msg({ id: 'c1', clientId: 'c1', pending: true }),
      msg({ id: 'c2', clientId: 'c2', pending: true, queued: true }),
      msg({ id: 'old' }),
    ];
    expect(mergeHistory(history, local).map((m) => m.id)).toEqual(['s1', 'c2']);
  });

  it('server echo replaces the optimistic bubble (by clientId) and keeps local E2EE plaintext', () => {
    const prev = [msg({ id: 'c1', clientId: 'c1', text: 'secret', encrypted: envelope, pending: true })];
    const { next, isNew } = upsertIncoming(prev, msg({ id: 's1', clientId: 'c1', text: '', encrypted: envelope }));
    expect(isNew).toBe(false);
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ id: 's1', text: 'secret', pending: false, queued: false });
  });

  it('new messages from others are appended and flagged as new', () => {
    const { next, isNew } = upsertIncoming([msg({})], msg({ id: 'm2', sender: 'bob' }));
    expect(isNew).toBe(true);
    expect(next).toHaveLength(2);
  });

  it('send ack assigns the server id and starts the self-destruct timer', () => {
    const prev = [msg({ id: 'c1', clientId: 'c1', pending: true, queued: true, ttl: 10 })];
    const [out] = applySendAck(prev, 'c1', 's1', 1000);
    expect(out).toMatchObject({ id: 's1', pending: false, queued: false, expiresAt: 11_000 });
  });

  it('counts unread messages from others only', () => {
    const list = [
      msg({ id: 'a', sender: 'bob' }),
      msg({ id: 'b', sender: 'bob', readBy: ['alice'] }),
      msg({ id: 'c', sender: 'alice' }),
      msg({ id: 'd', sender: 'bob', pending: true }),
      msg({ id: 'e', sender: 'bob', roomId: 'r2' }),
    ];
    expect(countUnread(list, 'r1', 'alice')).toBe(1);
    expect(unreadIds(list, 'r1', 'alice')).toEqual(['a']);
  });

  it('poll vote replaces the previous choice and ignores closed polls', () => {
    const poll = {
      id: 'p',
      question: 'q',
      options: [
        { id: 'o1', text: '1' },
        { id: 'o2', text: '2' },
      ],
      votes: { o1: ['alice', 'bob'] },
    } as unknown as NonNullable<Message['poll']>;
    const voted = applyPollVote(msg({ poll }), 'alice', ['o2']);
    expect(voted.poll?.votes).toEqual({ o1: ['bob'], o2: ['alice'] });
    const closed = msg({ poll: { ...poll, closed: true } });
    expect(applyPollVote(closed, 'alice', ['o2'])).toBe(closed);
  });
});
