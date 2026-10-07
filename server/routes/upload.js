/**
 * /api/upload — authenticated media/file upload.
 *
 * Every file is checked by magic bytes (an `.jpg` must really be a JPEG, etc.)
 * and photos are stripped of EXIF/XMP/IPTC metadata before being stored in
 * Supabase Storage (2.5 s race) or the local `/uploads` fallback.
 */
import fs from 'fs';
import path from 'path';
import express from 'express';
import multer from 'multer';
import { UPLOADS_DIR } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../services/supabase.js';
import { sanitizeUpload } from '../services/upload-validation.js';

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

/** Extensions served inline from /uploads; everything else is forced to download. */
export const INLINE_MIME_EXTS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
  '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.webm',
  '.mp4', '.mov',
]);

export const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic',
  '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.webm',
  '.mp4', '.mov', '.avi', '.mkv',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.zip', '.rar', '.7z',
]);

export function safeExtension(name) {
  const rawExt = path.extname(String(name || '')).toLowerCase().replace(/[^a-zA-Z0-9._-]/g, '');
  return ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : '.bin';
}

export const uniqueFileName = (name) =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${safeExtension(name)}`;

/** Decodes `data:<mime>;base64,<payload>` (or a bare base64 string). */
export function decodeBase64Payload(data) {
  let base64Data = String(data);
  const marker = ';base64,';
  const markerIndex = base64Data.indexOf(marker);
  if (markerIndex !== -1) base64Data = base64Data.substring(markerIndex + marker.length);
  else base64Data = base64Data.replace(/^data:.*?,/, '');
  return Buffer.from(base64Data, 'base64');
}

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Validates + strips metadata, then stores the buffer.
 * @returns {Promise<{ ok: true, url: string } | { ok: false, status: number, error: string }>}
 */
export async function storeUpload(buffer, { filename, declaredMime }) {
  const result = sanitizeUpload(buffer, { filename, declaredMime });
  if (!result.ok) return { ok: false, status: 415, error: result.error };

  const fileName = uniqueFileName(filename);
  const contentType = result.mime || 'application/octet-stream';

  try {
    const uploadPromise = supabase.storage
      .from('message-attachments')
      .upload(`uploads/${fileName}`, result.buffer, { contentType, upsert: true });
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Supabase storage upload timeout')), 2500).unref?.();
    });
    const sbRes = await Promise.race([uploadPromise, timeoutPromise]);
    if (!sbRes?.error && sbRes?.data) {
      const { data: urlData } = supabase.storage.from('message-attachments').getPublicUrl(sbRes.data.path);
      if (urlData?.publicUrl) return { ok: true, url: urlData.publicUrl };
    }
  } catch (err) {
    console.warn('[Supabase Storage Warning] Falling back to local upload URL:', err.message || err);
  }

  ensureUploadsDir();
  await fs.promises.writeFile(path.join(UPLOADS_DIR, fileName), result.buffer);
  return { ok: true, url: `/uploads/${fileName}` };
}

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

/** Static handler for the local fallback directory (nosniff + forced download for non-media). */
export function uploadsStatic() {
  ensureUploadsDir();
  return express.static(UPLOADS_DIR, {
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (!INLINE_MIME_EXTS.has(path.extname(filePath).toLowerCase())) {
        res.setHeader('Content-Disposition', 'attachment');
      }
    },
  });
}

export function createUploadRouter({ limiters }) {
  const router = express.Router();

  router.post('/', requireAuth, limiters.upload, (req, res) => {
    memoryUpload.single('file')(req, res, async (err) => {
      if (err) {
        const tooLarge = err.code === 'LIMIT_FILE_SIZE';
        return res.status(tooLarge ? 413 : 400).json({ error: tooLarge ? 'Файл больше 100 МБ.' : 'Ошибка загрузки файла.' });
      }
      try {
        let stored;
        if (req.file) {
          stored = await storeUpload(req.file.buffer, {
            filename: req.file.originalname,
            declaredMime: req.file.mimetype,
          });
        } else {
          const { name, data, type } = req.body || {};
          if (typeof name !== 'string' || typeof data !== 'string' || !name || !data) {
            return res.status(400).json({ error: 'Missing file payload or data' });
          }
          stored = await storeUpload(decodeBase64Payload(data), { filename: name, declaredMime: type });
        }
        if (!stored.ok) return res.status(stored.status).json({ error: stored.error });
        return res.json({ url: stored.url });
      } catch (uploadErr) {
        console.error('[Upload Error]', uploadErr);
        return res.status(500).json({ error: 'Failed to process file payload' });
      }
    });
  });

  return router;
}
