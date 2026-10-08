import { describe, expect, it } from 'vitest';
import { describeAttachments, detectFileKind, planBatchSend } from './outgoing-batch';

const f = (name: string, type: string) => ({ name, type });

const ids = () => {
  let n = 0;
  return () => `album-${++n}`;
};

describe('planBatchSend', () => {
  it('sends a single file as one message with the caption', () => {
    expect(planBatchSend([f('a', 'image')], 'hi', ids())).toEqual([{ file: f('a', 'image'), text: 'hi', albumId: undefined }]);
  });

  it('groups photos and videos into one album, caption on the first item', () => {
    const plan = planBatchSend([f('a', 'image'), f('b', 'video'), f('c', 'image')], 'caption', ids());
    expect(plan.map((p) => p.albumId)).toEqual(['album-1', 'album-1', 'album-1']);
    expect(plan.map((p) => p.text)).toEqual(['caption', '', '']);
  });

  it('puts media first and sends other files separately', () => {
    const plan = planBatchSend([f('doc', 'file'), f('a', 'image'), f('song', 'audio'), f('b', 'image')], '', ids());
    expect(plan.map((p) => p.file.name)).toEqual(['a', 'b', 'doc', 'song']);
    expect(plan.map((p) => p.albumId)).toEqual(['album-1', 'album-1', undefined, undefined]);
  });

  it('splits more than ten media into several albums', () => {
    const files = Array.from({ length: 12 }, (_, i) => f(`p${i}`, 'image'));
    const plan = planBatchSend(files, '', ids());
    expect(plan.filter((p) => p.albumId === 'album-1')).toHaveLength(10);
    // A lone leftover photo is a regular message, not a one-item album.
    expect(planBatchSend(files.slice(0, 11), '', ids())[10].albumId).toBeUndefined();
    expect(plan.filter((p) => p.albumId === 'album-2')).toHaveLength(2);
  });

  it('returns nothing for an empty selection', () => {
    expect(planBatchSend([], 'text', ids())).toEqual([]);
  });
});

describe('describeAttachments', () => {
  it('summarises by kind with Russian plurals', () => {
    expect(describeAttachments([f('a', 'image'), f('b', 'image'), f('c', 'video')])).toBe('2 фото, 1 видео');
    expect(describeAttachments([f('a', 'file'), f('b', 'audio')])).toBe('2 файла');
    expect(describeAttachments(Array.from({ length: 5 }, () => f('x', 'file')))).toBe('5 файлов');
  });
});

describe('detectFileKind', () => {
  it('uses the MIME type, then the extension', () => {
    expect(detectFileKind({ name: 'IMG.HEIC', type: '' })).toBe('image');
    expect(detectFileKind({ name: 'clip.bin', type: 'video/mp4' })).toBe('video');
    expect(detectFileKind({ name: 'track.mp3', type: '' })).toBe('audio');
    expect(detectFileKind({ name: 'cat.tgs', type: '' })).toBe('sticker');
    expect(detectFileKind({ name: 'report.pdf', type: 'application/pdf' })).toBe('file');
  });
});
