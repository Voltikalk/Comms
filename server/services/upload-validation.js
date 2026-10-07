/**
 * Upload hardening:
 *  1. Magic-byte sniffing — a file stored with a media extension (served inline)
 *     or declared with a media MIME type must really be that kind of media.
 *     This blocks HTML/SVG/script payloads renamed to .jpg/.mp4 etc.
 *  2. Metadata stripping — EXIF/XMP/IPTC (GPS, camera serial, timestamps) are
 *     removed from JPEG, PNG and WebP. JPEG orientation is preserved through a
 *     minimal re-generated EXIF block so phone photos do not end up rotated.
 */
import path from 'path';

const ascii = (buf, start, end) => buf.toString('latin1', start, end);
const startsWith = (buf, bytes, offset = 0) =>
  buf.length >= offset + bytes.length && bytes.every((b, i) => buf[offset + i] === b);

/**
 * @param {Buffer} buf
 * @returns {{ mime: string, kinds: Array<'image'|'video'|'audio'> } | null}
 */
export function sniffMedia(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 4) return null;

  if (startsWith(buf, [0xff, 0xd8, 0xff])) return { mime: 'image/jpeg', kinds: ['image'] };
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: 'image/png', kinds: ['image'] };
  if (ascii(buf, 0, 6) === 'GIF87a' || ascii(buf, 0, 6) === 'GIF89a') return { mime: 'image/gif', kinds: ['image'] };
  if (ascii(buf, 0, 2) === 'BM' && buf.length >= 26) return { mime: 'image/bmp', kinds: ['image'] };

  if (ascii(buf, 0, 4) === 'RIFF' && buf.length >= 12) {
    const form = ascii(buf, 8, 12);
    if (form === 'WEBP') return { mime: 'image/webp', kinds: ['image'] };
    if (form === 'WAVE') return { mime: 'audio/wav', kinds: ['audio'] };
    if (form === 'AVI ') return { mime: 'video/x-msvideo', kinds: ['video'] };
    return null;
  }

  // ISO base media file format (MP4, MOV, M4A, 3GP, HEIC): size + 'ftyp' + brand
  if (buf.length >= 12 && ascii(buf, 4, 8) === 'ftyp') {
    const brand = ascii(buf, 8, 12);
    if (['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'mif1', 'msf1', 'avif'].includes(brand)) {
      return { mime: brand === 'avif' ? 'image/avif' : 'image/heic', kinds: ['image'] };
    }
    if (brand === 'M4A ' || brand === 'M4B ') return { mime: 'audio/mp4', kinds: ['audio'] };
    if (brand === 'qt  ') return { mime: 'video/quicktime', kinds: ['video', 'audio'] };
    return { mime: 'video/mp4', kinds: ['video', 'audio'] };
  }

  // EBML (WebM / Matroska) — voice notes are audio/webm, videos video/webm
  if (startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3])) {
    const head = ascii(buf, 0, Math.min(buf.length, 64));
    return { mime: head.includes('webm') ? 'video/webm' : 'video/x-matroska', kinds: ['video', 'audio'] };
  }

  if (ascii(buf, 0, 4) === 'OggS') return { mime: 'audio/ogg', kinds: ['audio', 'video'] };
  if (ascii(buf, 0, 4) === 'fLaC') return { mime: 'audio/flac', kinds: ['audio'] };
  if (ascii(buf, 0, 3) === 'ID3') return { mime: 'audio/mpeg', kinds: ['audio'] };
  // MPEG audio / AAC ADTS frame sync (11 set bits)
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) {
    const isAdts = (buf[1] & 0xf6) === 0xf0;
    return { mime: isAdts ? 'audio/aac' : 'audio/mpeg', kinds: ['audio'] };
  }
  return null;
}

const EXT_KIND = {
  '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image', '.webp': 'image', '.bmp': 'image', '.heic': 'image',
  '.mp4': 'video', '.mov': 'video', '.avi': 'video', '.mkv': 'video', '.webm': 'video',
  '.mp3': 'audio', '.wav': 'audio', '.ogg': 'audio', '.m4a': 'audio', '.aac': 'audio',
};

export function expectedKind(filename, declaredMime) {
  const ext = path.extname(String(filename || '')).toLowerCase();
  if (EXT_KIND[ext]) return EXT_KIND[ext];
  const mime = String(declaredMime || '').toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return null;
}

/**
 * @returns {{ ok: true, mime: string | null, kind: string | null } | { ok: false, error: string }}
 */
export function validateUpload(buf, { filename, declaredMime } = {}) {
  if (!Buffer.isBuffer(buf) || buf.length === 0) return { ok: false, error: 'Пустой файл.' };
  const kind = expectedKind(filename, declaredMime);
  const sniffed = sniffMedia(buf);
  if (!kind) {
    // Documents/archives: allowed as attachments (served with Content-Disposition).
    return { ok: true, mime: sniffed?.mime || null, kind: null };
  }
  if (!sniffed || !sniffed.kinds.includes(kind)) {
    return { ok: false, error: 'Содержимое файла не соответствует заявленному типу.' };
  }
  return { ok: true, mime: sniffed.mime, kind };
}

// =============================================================================
// Metadata stripping
// =============================================================================

function readJpegOrientation(app1) {
  // app1: segment payload starting with "Exif\0\0"
  if (app1.length < 14 || ascii(app1, 0, 6) !== 'Exif\0\0') return null;
  const tiff = app1.subarray(6);
  const le = ascii(tiff, 0, 2) === 'II';
  if (!le && ascii(tiff, 0, 2) !== 'MM') return null;
  const u16 = (o) => (le ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o));
  const u32 = (o) => (le ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o));
  try {
    const ifd = u32(4);
    const count = u16(ifd);
    for (let i = 0; i < count; i += 1) {
      const entry = ifd + 2 + i * 12;
      if (u16(entry) === 0x0112) {
        const value = u16(entry + 8);
        return value >= 1 && value <= 8 ? value : null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/** Minimal big-endian EXIF APP1 segment carrying only the Orientation tag. */
function orientationSegment(orientation) {
  const payload = Buffer.from([
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // TIFF header (MM), IFD0 at 8
    0x00, 0x01, // 1 entry
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation, 0x00, 0x00, // Orientation SHORT
    0x00, 0x00, 0x00, 0x00, // no next IFD
  ]);
  const header = Buffer.from([0xff, 0xe1, 0x00, 0x00]);
  header.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([header, payload]);
}

/** Removes APP1 (EXIF/XMP), APP13 (IPTC) and COM segments. Returns the input on malformed data. */
export function stripJpegMetadata(buf) {
  if (!startsWith(buf, [0xff, 0xd8])) return buf;
  const out = [buf.subarray(0, 2)];
  let orientation = null;
  let i = 2;
  try {
    while (i < buf.length) {
      if (buf[i] !== 0xff) return buf;
      let marker = buf[i + 1];
      while (marker === 0xff) {
        i += 1;
        marker = buf[i + 1];
      }
      if (marker === undefined) return buf;
      // Standalone markers without a length field
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        out.push(buf.subarray(i, i + 2));
        i += 2;
        continue;
      }
      if (marker === 0xd9) {
        out.push(buf.subarray(i, i + 2));
        break;
      }
      const len = buf.readUInt16BE(i + 2);
      if (len < 2 || i + 2 + len > buf.length) return buf;
      const segmentEnd = i + 2 + len;
      if (marker === 0xda) {
        // Start of scan: entropy-coded data follows until EOI; keep verbatim.
        out.push(buf.subarray(i));
        break;
      }
      const isExifApp1 = marker === 0xe1;
      const drop = isExifApp1 || marker === 0xed || marker === 0xfe;
      if (isExifApp1 && orientation === null) orientation = readJpegOrientation(buf.subarray(i + 4, segmentEnd));
      if (!drop) out.push(buf.subarray(i, segmentEnd));
      i = segmentEnd;
    }
  } catch {
    return buf;
  }
  if (orientation && orientation !== 1) {
    // Insert after SOI and APP0/JFIF if present (JFIF must stay first).
    const insertAt = out.length > 1 && out[1][1] === 0xe0 ? 2 : 1;
    out.splice(insertAt, 0, orientationSegment(orientation));
  }
  return Buffer.concat(out);
}

const PNG_DROP_CHUNKS = new Set(['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME']);

export function stripPngMetadata(buf) {
  if (!startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return buf;
  const out = [buf.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= buf.length) {
    const len = buf.readUInt32BE(i);
    const type = ascii(buf, i + 4, i + 8);
    const end = i + 12 + len;
    if (end > buf.length) return buf;
    if (!PNG_DROP_CHUNKS.has(type)) out.push(buf.subarray(i, end));
    i = end;
    if (type === 'IEND') break;
  }
  return Buffer.concat(out);
}

/** Drops EXIF/XMP chunks from extended WebP and clears the matching VP8X flags. */
export function stripWebpMetadata(buf) {
  if (ascii(buf, 0, 4) !== 'RIFF' || ascii(buf, 8, 12) !== 'WEBP') return buf;
  const chunks = [];
  let i = 12;
  while (i + 8 <= buf.length) {
    const fourcc = ascii(buf, i, i + 4);
    const size = buf.readUInt32LE(i + 4);
    const end = i + 8 + size + (size % 2);
    if (end > buf.length) return buf;
    if (fourcc !== 'EXIF' && fourcc !== 'XMP ') {
      const chunk = Buffer.from(buf.subarray(i, end));
      if (fourcc === 'VP8X' && chunk.length > 8) chunk[8] &= ~(0x08 | 0x04);
      chunks.push(chunk);
    }
    i = end;
  }
  const body = Buffer.concat(chunks);
  const header = Buffer.from('RIFF\0\0\0\0WEBP', 'latin1');
  header.writeUInt32LE(body.length + 4, 4);
  return Buffer.concat([header, body]);
}

export function stripImageMetadata(buf, mime) {
  if (mime === 'image/jpeg') return stripJpegMetadata(buf);
  if (mime === 'image/png') return stripPngMetadata(buf);
  if (mime === 'image/webp') return stripWebpMetadata(buf);
  return buf;
}

/**
 * Full pipeline used by HTTP and socket uploads.
 * @returns {{ ok: true, buffer: Buffer, mime: string | null, kind: string | null } | { ok: false, error: string }}
 */
export function sanitizeUpload(buf, opts) {
  const res = validateUpload(buf, opts);
  if (!res.ok) return res;
  const buffer = res.kind === 'image' ? stripImageMetadata(buf, res.mime) : buf;
  return { ok: true, buffer, mime: res.mime, kind: res.kind };
}
