/**
 * Server configuration: .env loading, secrets, token lifetimes, CORS origins.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(__dirname, '..');

function loadEnv() {
  // Vitest sets VITEST; tests must not pick up a developer's real .env secrets.
  if (process.env.VITEST) return;
  const envLocalPath = path.join(rootDir, '.env.local');
  const envPath = path.join(rootDir, '.env');
  const target = fs.existsSync(envLocalPath) ? envLocalPath : (fs.existsSync(envPath) ? envPath : null);

  if (target) {
    const content = fs.readFileSync(target, 'utf-8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...vals] = trimmed.split('=');
        if (key && vals.length > 0) {
          process.env[key.trim()] = vals.join('=').trim();
        }
      }
    });
  }
}
loadEnv();

// Vitest itself injects VITE_* vars from .env.local into process.env, so the
// guard above is not enough: keep tests on the in-memory store, off the network.
export const SUPABASE_URL = process.env.VITEST ? '' : process.env.VITE_SUPABASE_URL || '';
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const DEFAULT_JWT_ACCESS = 'comms_jwt_access_secret_super_secure_key_2026';
const DEFAULT_JWT_REFRESH = 'comms_jwt_refresh_secret_super_secure_key_2026';

export const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || DEFAULT_JWT_ACCESS;
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || DEFAULT_JWT_REFRESH;
export const usingDefaultJwtSecrets =
  JWT_ACCESS_SECRET === DEFAULT_JWT_ACCESS || JWT_REFRESH_SECRET === DEFAULT_JWT_REFRESH;

export const ACCESS_TOKEN_EXPIRY = '15m';
export const REFRESH_TOKEN_EXPIRY = '7d';
export const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60;
export const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

/** 2FA challenge issued after a correct password when a cloud password is set. */
export const TWO_FA_CHALLENGE_EXPIRY = '5m';

export const UPLOADS_DIR = path.join(rootDir, 'uploads');

export const ALLOWED_ORIGINS = [
  process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'https://commsint.duckdns.org',
  'http://commsint.duckdns.org',
  'https://dabim.forgottenght.online',
  'http://dabim.forgottenght.online',
  process.env.PRODUCTION_ORIGIN, // e.g. https://dabim.forgottenght.online
].filter(Boolean);

export function isOriginAllowed(origin, hostHeader) {
  if (!origin) return true; // Same-origin or non-browser request
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin.startsWith('https://localhost:')
  ) {
    return true;
  }
  if (hostHeader) {
    const cleanHost = String(hostHeader).toLowerCase().trim();
    if (origin === `https://${cleanHost}` || origin === `http://${cleanHost}`) {
      return true;
    }
  }
  try {
    const parsed = new URL(origin);
    const h = parsed.hostname.toLowerCase();
    if (
      h.endsWith('.duckdns.org') ||
      h.endsWith('.forgottenght.online') ||
      h === '31.76.2.136' ||
      h === 'localhost' ||
      h === '127.0.0.1'
    ) {
      return true;
    }
  } catch {}
  return false;
}
