/**
 * Application factory: Express (security headers, CORS, rate limits, routes)
 * + Socket.io on a shared HTTP server. Used by `server.js` and the
 * integration tests (which listen on port 0 with rate limits disabled).
 */
import { createServer } from 'http';
import express from 'express';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { ALLOWED_ORIGINS, isOriginAllowed } from './config.js';
import { createLimiters } from './middleware/rateLimit.js';
import { createAuthRouter } from './routes/auth.js';
import { createUploadRouter, uploadsStatic } from './routes/upload.js';
import { createUsersRouter } from './routes/users.js';
import { pruneRevokedTokens } from './services/crypto.js';
import { cloudPasswordAttempts } from './services/cloud-password.js';
import { sessionStore } from './services/session-store.js';
import { loadMessagesFromSupabase, loadRoomsFromSupabase, pruneExpiredStories } from './services/store.js';
import { initUsers } from './services/users.js';
import { attachSockets } from './sockets/index.js';
import { startChatSweeper } from './sockets/chat.js';

function cors(req, res, next) {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin, req.headers.host)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}

/**
 * @param {{ rateLimit?: boolean, background?: boolean }} [opts]
 *   rateLimit  — express-rate-limit limiters (off in tests)
 *   background — Supabase preload + periodic maintenance timers (off in tests)
 */
export function createServerApp({ rateLimit = true, background = true } = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: false, // CSP is set by nginx for the SPA
      crossOriginEmbedderPolicy: false,
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ limit: '2mb', extended: true }));
  app.use(cors);

  const limiters = createLimiters({ enabled: rateLimit });
  app.use('/api/', limiters.global);

  app.use('/uploads', uploadsStatic());
  app.use('/api/upload', createUploadRouter({ limiters }));
  app.use('/api/auth', createAuthRouter({ limiters }));
  app.use('/api/users', createUsersRouter());

  // Malformed JSON and other body-parser errors → 400 instead of an HTML stack trace
  app.use((err, _req, res, next) => {
    if (res.headersSent) return next(err);
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error('[HTTP Error]', err);
    return res.status(status).json({ error: status >= 500 ? 'Внутренняя ошибка сервера.' : 'Некорректный запрос.' });
  });

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'], credentials: true },
    maxHttpBufferSize: 5e6,
  });
  const detachSockets = attachSockets(io);

  const stops = [detachSockets];
  const ready = initUsers();
  if (background) {
    void loadRoomsFromSupabase();
    void loadMessagesFromSupabase();
    stops.push(startChatSweeper(io));
    const every = (fn, ms) => {
      const t = setInterval(fn, ms);
      t.unref?.();
      stops.push(() => clearInterval(t));
    };
    every(pruneExpiredStories, 10 * 60 * 1000);
    every(() => {
      pruneRevokedTokens();
      sessionStore.prune();
      cloudPasswordAttempts.prune();
    }, 15 * 60 * 1000);
  }

  const close = () =>
    new Promise((resolve) => {
      for (const stop of stops) stop();
      io.close(() => resolve());
    });

  return { app, httpServer, io, ready, close };
}
