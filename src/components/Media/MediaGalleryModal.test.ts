import { describe, it, expect } from 'vitest';
import type { Message } from '../../types';

describe('Media Gallery Filter & Index Suite', () => {
  const mockMessages: Message[] = [
    {
      id: 'msg-1',
      roomId: 'family',
      text: 'First text only',
      sender: 'vlad',
      timestamp: Date.now(),
    },
    {
      id: 'msg-2',
      roomId: 'family',
      text: 'Photo of the mountains',
      sender: 'vlad',
      timestamp: Date.now(),
      file: {
        name: 'mountains.jpg',
        type: 'image',
        data: 'https://example.com/mountains.jpg',
        size: 1024,
      },
    },
    {
      id: 'msg-3',
      roomId: 'family',
      text: 'Document pdf',
      sender: 'anya',
      timestamp: Date.now(),
      file: {
        name: 'report.pdf',
        type: 'file',
        data: 'https://example.com/report.pdf',
        size: 2048,
      },
    },
    {
      id: 'msg-4',
      roomId: 'family',
      text: 'Video demonstration',
      sender: 'anya',
      timestamp: Date.now(),
      file: {
        name: 'demo.mp4',
        type: 'video',
        data: 'https://example.com/demo.mp4',
        size: 4096,
      },
    },
  ];

  it('should filter only images and videos for gallery viewer', () => {
    const mediaList = mockMessages.filter(
      (m) =>
        m.file &&
        (m.file.type === 'image' ||
          m.file.type === 'video' ||
          m.file.type?.startsWith('image/') ||
          m.file.type?.startsWith('video/') ||
          /\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|mov)$/i.test(m.file.name || ''))
    );

    expect(mediaList).toHaveLength(2);
    expect(mediaList[0].id).toBe('msg-2');
    expect(mediaList[1].id).toBe('msg-4');
  });

  it('should calculate correct current index and navigation limits', () => {
    const mediaList = mockMessages.filter((m) => m.file && (m.file.type === 'image' || m.file.type === 'video'));
    const activeId = 'msg-4';
    const index = mediaList.findIndex((m) => m.id === activeId);

    expect(index).toBe(1);
    expect(index > 0).toBe(true); // Can go prev
    expect(index < mediaList.length - 1).toBe(false); // At end, cannot go next
  });
});
