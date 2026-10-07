/**
 * Secure Comms backend entry point.
 *
 * The implementation lives in ./server:
 *   server/app.js         — Express + Socket.io factory
 *   server/routes/        — auth (cookie refresh, 2FA, sessions), upload, users
 *   server/sockets/       — rooms/presence, chat, call, stories
 *   server/middleware/    — auth, rateLimit, validate
 *   server/services/      — supabase, crypto, users, sessions, store, uploads
 */
import { SUPABASE_URL, usingDefaultJwtSecrets } from './server/config.js';
import { createServerApp } from './server/app.js';

if (!SUPABASE_URL) {
  console.error('[FATAL] VITE_SUPABASE_URL is not configured. Set it in .env or .env.local');
  process.exit(1);
}
if (usingDefaultJwtSecrets) {
  console.warn('[Security] JWT_ACCESS_SECRET / JWT_REFRESH_SECRET are not set — using built-in defaults. Set unique secrets in production!');
}

const { httpServer } = createServerApp();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[Supabase] Server initialized with endpoint: ${SUPABASE_URL}`);
  console.log(`🚀 Secure Comms Server: API & WebSockets on http://localhost:${PORT}`);
});
