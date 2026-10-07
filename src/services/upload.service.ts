import { SERVER_URL } from '../constants';
import authService from './auth.service';

export interface UploadSource {
  name: string;
  type: string;
  data: string;
  rawBlob?: Blob | File;
}

function send(file: UploadSource, token: string | null, onProgress?: (percent: number) => void) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${SERVER_URL}/api/upload`);
    xhr.withCredentials = true;
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
    xhr.onerror = () => reject(new Error('Network error during upload'));
    if (file.rawBlob) {
      const form = new FormData();
      form.append('file', file.rawBlob, file.name);
      xhr.send(form);
    } else {
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify({ name: file.name, type: file.type, data: file.data }));
    }
  });
}

/**
 * Uploads media to `/api/upload` (magic-byte validated + EXIF-stripped on the
 * server). Uses the in-memory bearer token and retries once after a refresh.
 */
export async function uploadFile(file: UploadSource, onProgress?: (percent: number) => void): Promise<string> {
  let res = await send(file, authService.getAccessToken(), onProgress);
  if (res.status === 401 && (await authService.refresh())) {
    res = await send(file, authService.getAccessToken(), onProgress);
  }
  if (res.status < 200 || res.status >= 300) {
    let reason = `Upload failed: ${res.status}`;
    try {
      reason = (JSON.parse(res.body) as { error?: string }).error || reason;
    } catch {
      // non-JSON error page
    }
    throw new Error(reason);
  }
  const url = (JSON.parse(res.body) as { url?: string }).url;
  if (!url) throw new Error('Invalid upload response');
  return url;
}
