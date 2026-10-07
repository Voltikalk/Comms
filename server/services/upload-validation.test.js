import { describe, expect, it } from 'vitest';
import {
  expectedKind,
  sanitizeUpload,
  sniffMedia,
  stripJpegMetadata,
  stripPngMetadata,
  stripWebpMetadata,
  validateUpload,
} from './upload-validation.js';

const seg = (marker, payload) => {
  const head = Buffer.from([0xff, marker, 0, 0]);
  head.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([head, payload]);
};

/** EXIF APP1 payload with Orientation + a fake GPS-ish string to prove removal. */
const exifPayload = (orientation) =>
  Buffer.concat([
    Buffer.from('Exif\0\0', 'latin1'),
    Buffer.from([0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, 0x00, 0x01]),
    Buffer.from([0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation, 0x00, 0x00]),
    Buffer.from([0, 0, 0, 0]),
    Buffer.from('GPS 55.7558N 37.6173E', 'latin1'),
  ]);

const jpeg = (...segments) =>
  Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    ...segments,
    seg(0xda, Buffer.from([1, 2, 3])),
    Buffer.from([0x11, 0x22, 0xff, 0x00, 0x33]),
    Buffer.from([0xff, 0xd9]),
  ]);

const jfif = seg(0xe0, Buffer.from('JFIF\0\x01\x01', 'latin1'));

const pngChunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  return Buffer.concat([len, Buffer.from(type, 'latin1'), data, Buffer.alloc(4)]);
};
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const webpChunk = (fourcc, data) => {
  const size = Buffer.alloc(4);
  size.writeUInt32LE(data.length);
  return Buffer.concat([Buffer.from(fourcc, 'latin1'), size, data, data.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]);
};
const webp = (...chunks) => {
  const body = Buffer.concat(chunks);
  const head = Buffer.from('RIFF\0\0\0\0WEBP', 'latin1');
  head.writeUInt32LE(body.length + 4, 4);
  return Buffer.concat([head, body]);
};

describe('sniffMedia', () => {
  it('detects common image, video and audio containers', () => {
    expect(sniffMedia(jpeg())?.mime).toBe('image/jpeg');
    expect(sniffMedia(Buffer.concat([PNG_SIG, pngChunk('IEND', Buffer.alloc(0))]))?.mime).toBe('image/png');
    expect(sniffMedia(Buffer.from('GIF89a......', 'latin1'))?.mime).toBe('image/gif');
    expect(sniffMedia(webp(webpChunk('VP8 ', Buffer.alloc(10))))?.mime).toBe('image/webp');
    expect(sniffMedia(Buffer.from('\0\0\0\x18ftypisom\0\0\0\0', 'latin1'))?.kinds).toContain('video');
    expect(sniffMedia(Buffer.from('\0\0\0\x18ftypM4A \0\0\0\0', 'latin1'))?.kinds).toEqual(['audio']);
    expect(sniffMedia(Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0]))?.kinds).toEqual(expect.arrayContaining(['video', 'audio']));
    expect(sniffMedia(Buffer.from('OggS\0\0\0\0', 'latin1'))?.kinds).toContain('audio');
    expect(sniffMedia(Buffer.from('ID3\x04\0\0\0\0', 'latin1'))?.mime).toBe('audio/mpeg');
  });

  it('returns null for HTML, SVG and scripts', () => {
    expect(sniffMedia(Buffer.from('<html><script>alert(1)</script></html>'))).toBeNull();
    expect(sniffMedia(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(sniffMedia(Buffer.from('#!/bin/sh\nrm -rf /'))).toBeNull();
    expect(sniffMedia(Buffer.alloc(2))).toBeNull();
  });
});

describe('validateUpload', () => {
  it('prefers the extension over the declared MIME type', () => {
    expect(expectedKind('a.mp4', 'image/png')).toBe('video');
    expect(expectedKind('noext', 'audio/ogg')).toBe('audio');
    expect(expectedKind('doc.pdf', 'application/pdf')).toBeNull();
  });

  it('rejects an HTML payload disguised as a JPEG', () => {
    const res = validateUpload(Buffer.from('<html><script>steal()</script>'), { filename: 'cat.jpg', declaredMime: 'image/jpeg' });
    expect(res.ok).toBe(false);
  });

  it('rejects a PNG uploaded as video', () => {
    const png = Buffer.concat([PNG_SIG, pngChunk('IEND', Buffer.alloc(0))]);
    expect(validateUpload(png, { filename: 'clip.mp4' }).ok).toBe(false);
  });

  it('accepts documents without media sniffing and rejects empty files', () => {
    expect(validateUpload(Buffer.from('%PDF-1.7'), { filename: 'report.pdf' })).toMatchObject({ ok: true, kind: null });
    expect(validateUpload(Buffer.alloc(0), { filename: 'x.txt' }).ok).toBe(false);
  });
});

describe('stripJpegMetadata', () => {
  it('removes EXIF/IPTC/COM segments but keeps image data', () => {
    const src = jpeg(jfif, seg(0xe1, exifPayload(1)), seg(0xed, Buffer.from('IPTC')), seg(0xfe, Buffer.from('comment')));
    const out = stripJpegMetadata(src);
    expect(out.includes(Buffer.from('GPS'))).toBe(false);
    expect(out.includes(Buffer.from('IPTC'))).toBe(false);
    expect(out.includes(Buffer.from('comment'))).toBe(false);
    expect(out.includes(Buffer.from('JFIF'))).toBe(true);
    expect(out.subarray(-7)).toEqual(Buffer.from([0x11, 0x22, 0xff, 0x00, 0x33, 0xff, 0xd9]));
  });

  it('preserves a non-default orientation in a minimal EXIF block after APP0', () => {
    const out = stripJpegMetadata(jpeg(jfif, seg(0xe1, exifPayload(6))));
    expect(out.includes(Buffer.from('GPS'))).toBe(false);
    const app1 = out.indexOf(Buffer.from('Exif\0\0', 'latin1'));
    expect(app1).toBeGreaterThan(out.indexOf(Buffer.from('JFIF')));
    expect(out[app1 + 6 + 8 + 2 + 9]).toBe(6);
  });

  it('returns malformed input unchanged', () => {
    const broken = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff]);
    expect(stripJpegMetadata(broken)).toBe(broken);
  });
});

describe('stripPngMetadata / stripWebpMetadata', () => {
  it('drops PNG text, time and eXIf chunks', () => {
    const src = Buffer.concat([
      PNG_SIG,
      pngChunk('IHDR', Buffer.alloc(13)),
      pngChunk('tEXt', Buffer.from('Author\0secret')),
      pngChunk('eXIf', Buffer.from('MM\0*GPS')),
      pngChunk('tIME', Buffer.alloc(7)),
      pngChunk('IDAT', Buffer.from([1, 2, 3])),
      pngChunk('IEND', Buffer.alloc(0)),
    ]);
    const out = stripPngMetadata(src);
    expect(out.includes(Buffer.from('secret'))).toBe(false);
    expect(out.includes(Buffer.from('GPS'))).toBe(false);
    expect(out.includes(Buffer.from('IDAT'))).toBe(true);
  });

  it('drops WebP EXIF/XMP chunks, clears VP8X flags and fixes the RIFF size', () => {
    const vp8x = Buffer.alloc(10);
    vp8x[0] = 0x08 | 0x04 | 0x10;
    const src = webp(webpChunk('VP8X', vp8x), webpChunk('VP8 ', Buffer.alloc(6)), webpChunk('EXIF', Buffer.from('GPSDATA')), webpChunk('XMP ', Buffer.from('<x:xmp/>')));
    const out = stripWebpMetadata(src);
    expect(out.includes(Buffer.from('GPSDATA'))).toBe(false);
    expect(out.includes(Buffer.from('<x:xmp'))).toBe(false);
    expect(out.readUInt32LE(4)).toBe(out.length - 8);
    expect(out[20] & 0x0c).toBe(0);
    expect(out[20] & 0x10).toBe(0x10);
  });
});

describe('sanitizeUpload', () => {
  it('validates and strips in one step', () => {
    const res = sanitizeUpload(jpeg(seg(0xe1, exifPayload(1))), { filename: 'p.jpeg' });
    expect(res.ok).toBe(true);
    expect(res.mime).toBe('image/jpeg');
    expect(res.buffer.includes(Buffer.from('GPS'))).toBe(false);
  });
});
