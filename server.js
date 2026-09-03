import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;

// =============================================================================
// 🔧 ENVIRONMENT & SUPABASE CLIENT INITIALIZATION
// =============================================================================

function loadEnv() {
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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://mpjizafibhffabwybpgj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

console.log(`[Supabase] Server initialized with endpoint: ${SUPABASE_URL}`);

const app = express();
const httpServer = createServer(app);

// Trust proxy headers for reverse proxies
app.set('trust proxy', 1);

// JSON and URL-encoded parsers
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Enable CORS for API routes
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Configure static uploads directory (local fallback)
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Whitelist of allowed extensions for upload security
const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic',
  '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.webm',
  '.mp4', '.mov', '.avi', '.mkv',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.zip', '.rar', '.7z'
]);

// Multer storage engine for direct binary uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const rawExt = path.extname(file.originalname || '').toLowerCase().replace(/[^a-zA-Z0-9._-]/g, '');
    const ext = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : '.bin';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
    cb(null, uniqueName);
  }
});

const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// File Upload endpoint (Uploads directly to Supabase Storage with local fallback)
app.post('/api/upload', (req, res) => {
  uploadMiddleware.single('file')(req, res, async (err) => {
    if (err) {
      console.error('[Upload Middleware Error]', err);
      return res.status(400).json({ error: err.message || 'File upload error' });
    }

    if (req.file) {
      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        const uniquePath = `uploads/${Date.now()}-${req.file.filename}`;
        
        // Fast race with timeout so client never hangs if remote bucket is slow/unreachable
        const uploadPromise = supabase.storage
          .from('message-attachments')
          .upload(uniquePath, fileBuffer, {
            contentType: req.file.mimetype,
            upsert: true,
          });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase storage upload timeout')), 2500)
        );

        const sbRes = await Promise.race([uploadPromise, timeoutPromise]);
        const uploadData = sbRes?.data;
        const sbErr = sbRes?.error;

        if (!sbErr && uploadData) {
          const { data: urlData } = supabase.storage
            .from('message-attachments')
            .getPublicUrl(uploadData.path);
          if (urlData?.publicUrl) {
            return res.json({ url: urlData.publicUrl });
          }
        }
      } catch (uploadErr) {
        console.warn('[Supabase Storage Warning] Falling back to local upload URL:', uploadErr.message || uploadErr);
      }

      const relativeUrl = `/uploads/${req.file.filename}`;
      return res.json({ url: relativeUrl });
    }

    // Fallback: Base64 JSON payload
    try {
      const { name, data } = req.body || {};
      if (!name || !data) {
        return res.status(400).json({ error: 'Missing file payload or data' });
      }
      let base64Data = data;
      const marker = ';base64,';
      const markerIndex = base64Data.indexOf(marker);
      if (markerIndex !== -1) {
        base64Data = base64Data.substring(markerIndex + marker.length);
      } else {
        base64Data = base64Data.replace(/^data:.*?,/, '');
      }
      const buffer = Buffer.from(base64Data, 'base64');
      
      const rawExt = path.extname(name).toLowerCase().replace(/[^a-zA-Z0-9._-]/g, '');
      const ext = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : '.bin';
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
      const filePath = path.join(UPLOADS_DIR, uniqueName);
      
      fs.writeFileSync(filePath, buffer);
      
      const relativeUrl = `/uploads/${uniqueName}`;
      return res.json({ url: relativeUrl });
    } catch (fallbackErr) {
      console.error('[Upload Base64 Error]', fallbackErr);
      return res.status(500).json({ error: 'Failed to process file payload' });
    }
  });
});

// =============================================================================
// 🔐 AUTHENTICATION & JWT CONFIGURATION
// =============================================================================

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'comms_jwt_access_secret_super_secure_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'comms_jwt_refresh_secret_super_secure_key_2026';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60;
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

// Seed preset accounts in memory cache
const memoryUsers = new Map();

const SEED_USERS = [
  { userId: 'vlad', email: 'vlad@telegram.org', username: 'vlad', pass: 'vladpass', firstName: 'Влад', lastName: '', bio: '⚡ Всегда на связи', statusEmoji: '⚡' },
  { userId: 'anya', email: 'anya@telegram.org', username: 'anya', pass: 'anyapass', firstName: 'Аня', lastName: '❤️', bio: 'Люблю Влада ❤️', statusEmoji: '❤️' },
  { userId: 'mom', email: 'mom@telegram.org', username: 'mom', pass: 'mompass', firstName: 'Мама', lastName: '', bio: 'Всегда на связи ☕', statusEmoji: '🌸' },
  { userId: 'dad', email: 'dad@telegram.org', username: 'dad', pass: 'dadpass', firstName: 'Папа', lastName: '', bio: 'На работе 🚗', statusEmoji: '🔧' },
  { userId: 'sister', email: 'sister@telegram.org', username: 'sister', pass: 'sispass', firstName: 'Сестра', lastName: '', bio: 'Слушаю музыку 🎧', statusEmoji: '✨' }
];

async function initUsers() {
  for (const u of SEED_USERS) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(u.pass, salt);
    
    const userDoc = {
      id: u.userId,
      userId: u.userId,
      email: u.email.toLowerCase(),
      username: u.username.toLowerCase(),
      passwordHash,
      salt,
      isActive: true,
      firstName: u.firstName,
      lastName: u.lastName,
      bio: u.bio,
      avatarUrl: '',
      statusEmoji: u.statusEmoji,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    memoryUsers.set(u.userId, userDoc);
    memoryUsers.set(u.email.toLowerCase(), userDoc);
    memoryUsers.set(u.username.toLowerCase(), userDoc);
  }

  // Load registered users from Supabase PostgreSQL
  try {
    const { data: dbUsers, error } = await supabase.from('users').select('*');
    if (!error && dbUsers) {
      for (const u of dbUsers) {
        const userId = u.username || u.id;
        const userDoc = {
          id: u.id,
          userId: userId,
          email: (u.email || '').toLowerCase(),
          username: (u.username || '').toLowerCase(),
          passwordHash: u.password_hash || '',
          isActive: u.is_active !== false,
          firstName: u.display_name || u.username,
          lastName: '',
          bio: u.bio || '',
          avatarUrl: u.avatar_url || '',
          statusEmoji: '✨',
          createdAt: u.created_at ? new Date(u.created_at) : new Date(),
          updatedAt: u.updated_at ? new Date(u.updated_at) : new Date()
        };
        memoryUsers.set(userId, userDoc);
        if (u.id) memoryUsers.set(u.id, userDoc);
        if (u.email) memoryUsers.set(u.email.toLowerCase(), userDoc);
        if (u.username) memoryUsers.set(u.username.toLowerCase(), userDoc);
      }
      console.log(`[Supabase Auth] Loaded ${dbUsers.length} users into auth cache.`);
    }
  } catch (err) {
    console.warn('[Supabase Auth Warning] Could not load users from Supabase:', err.message);
  }
}
initUsers();

function sanitizeUser(user) {
  return {
    userId: user.userId,
    email: user.email,
    username: user.username,
    createdAt: user.createdAt || new Date(),
    updatedAt: user.updatedAt || new Date(),
    lastLogin: user.lastLogin || null,
    isActive: user.isActive !== false,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    bio: user.bio || '',
    phoneNumber: user.phoneNumber || '',
    avatarUrl: user.avatarUrl || '',
    statusEmoji: user.statusEmoji || ''
  };
}

function generateTokenPair(user, sessionId) {
  const payload = {
    userId: user.userId,
    email: user.email,
    username: user.username,
    sessionId
  };

  const accessToken = jwt.sign({ ...payload, type: 'access' }, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY
  });

  const refreshToken = jwt.sign({ ...payload, type: 'refresh' }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY
  });

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000);

  return {
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
      tokenType: 'Bearer'
    },
    expiresAt
  };
}

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Укажите email/логин и пароль.' });
    }

    let rawInput = String(email).trim();
    if (rawInput.startsWith('@')) {
      rawInput = rawInput.slice(1).trim();
    }
    const cleanInput = rawInput.toLowerCase();

    // 1. Search in memory cache
    let user = memoryUsers.get(cleanInput);

    // 2. If not found in memory, query Supabase users table dynamically
    if (!user) {
      try {
        const { data: dbUser, error: dbErr } = await supabase
          .from('users')
          .select('*')
          .or(`username.ilike.${cleanInput},email.ilike.${cleanInput}`)
          .maybeSingle();

        if (dbUser && !dbErr) {
          user = {
            id: dbUser.id,
            userId: dbUser.username || dbUser.id,
            email: (dbUser.email || '').toLowerCase(),
            username: (dbUser.username || '').toLowerCase(),
            passwordHash: dbUser.password_hash || '',
            isActive: dbUser.is_active !== false,
            firstName: dbUser.display_name || dbUser.username,
            lastName: '',
            bio: dbUser.bio || '',
            avatarUrl: dbUser.avatar_url || '',
            statusEmoji: '✨',
            createdAt: dbUser.created_at ? new Date(dbUser.created_at) : new Date(),
            updatedAt: dbUser.updated_at ? new Date(dbUser.updated_at) : new Date()
          };
          memoryUsers.set(user.userId, user);
          if (user.id) memoryUsers.set(user.id, user);
          if (user.email) memoryUsers.set(user.email, user);
          if (user.username) memoryUsers.set(user.username, user);
        }
      } catch (sbErr) {
        console.warn('[Login DB lookup error]', sbErr.message);
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Неверный email/логин или пароль.' });
    }

    // 3. Check password: exact match (plain text) or bcrypt
    let isMatch = false;
    if (user.passwordHash) {
      if (user.passwordHash === password) {
        isMatch = true;
      } else {
        try {
          isMatch = await bcrypt.compare(password, user.passwordHash);
        } catch {
          isMatch = false;
        }
      }
    }

    // 4. Fallback: Check with Supabase Auth directly if bcrypt didn't match
    if (!isMatch) {
      try {
        const emailToTry = cleanInput.includes('@') ? cleanInput : `${cleanInput}@telegram.org`;
        const { data: sbAuth, error: sbErr } = await supabase.auth.signInWithPassword({
          email: emailToTry,
          password
        });
        if (!sbErr && sbAuth?.user) {
          isMatch = true;
          // Sync hash for faster logins
          try {
            const salt = await bcrypt.genSalt(10);
            user.passwordHash = await bcrypt.hash(password, salt);
            await supabase.from('users').update({ password_hash: user.passwordHash }).eq('id', user.id);
          } catch {}
        }
      } catch {}
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Неверный email/логин или пароль.' });
    }

    const sessionId = 'sess_' + Math.random().toString(36).substring(2, 11);
    const { tokens } = generateTokenPair(user, sessionId);

    return res.json({
      user: sanitizeUser(user),
      tokens
    });
  } catch (err) {
    console.error('[Login Error]', err);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
  }
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, username, password, firstName, lastName, avatarUrl, bio } = req.body || {};
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Заполните все обязательные поля.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.toLowerCase().trim();

    if (memoryUsers.has(cleanEmail) || memoryUsers.has(cleanUsername)) {
      return res.status(409).json({ error: 'Пользователь с таким email или username уже существует.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = cleanUsername;
    const displayName = `${firstName || cleanUsername} ${lastName || ''}`.trim();
    const newUuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 11);

    // Persist to Supabase PostgreSQL users table
    try {
      await supabase.from('users').insert({
        id: newUuid,
        email: cleanEmail,
        username: cleanUsername,
        password_hash: passwordHash,
        display_name: displayName,
        avatar_url: avatarUrl || '',
        bio: bio || '',
        is_active: true
      });
      console.log(`[Supabase Register] User ${cleanUsername} successfully persisted to database.`);
    } catch (sbErr) {
      console.warn('[Supabase Register Warning] Could not persist user to DB:', sbErr.message);
    }

    const newUser = {
      id: newUuid,
      userId,
      email: cleanEmail,
      username: cleanUsername,
      passwordHash,
      salt,
      isActive: true,
      firstName: firstName || cleanUsername,
      lastName: lastName || '',
      avatarUrl: avatarUrl || '',
      bio: bio || '',
      statusEmoji: '✨',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    memoryUsers.set(userId, newUser);
    memoryUsers.set(newUuid, newUser);
    memoryUsers.set(cleanEmail, newUser);
    memoryUsers.set(cleanUsername, newUser);

    const sessionId = 'sess_' + Math.random().toString(36).substring(2, 11);
    const { tokens } = generateTokenPair(newUser, sessionId);

    return res.status(201).json({
      user: sanitizeUser(newUser),
      tokens
    });
  } catch (err) {
    console.error('[Register Error]', err);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
  }
});

// GET /api/users/search
app.get('/api/users/search', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim().toLowerCase();
    const currentUserId = (req.query.currentUserId || '').toString().trim().toLowerCase();
    if (!q || q.length < 1) {
      return res.json({ users: [] });
    }

    const resultsMap = new Map();

    // 1. Search in Supabase
    try {
      const { data: dbUsers } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, bio, is_active')
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(25);

      if (dbUsers) {
        dbUsers.forEach((u) => {
          const uName = (u.username || '').toLowerCase();
          if (uName !== currentUserId && u.id !== currentUserId) {
            resultsMap.set(uName, {
              userId: u.username,
              username: u.username,
              displayName: u.display_name || u.username,
              avatarUrl: u.avatar_url || '',
              bio: u.bio || '',
              isOnline: (userSockets.get(u.username)?.size || 0) > 0
            });
          }
        });
      }
    } catch {
      // Supabase search fallback
    }

    // 2. Search in memoryUsers
    for (const [key, user] of memoryUsers.entries()) {
      if (typeof key === 'string' && key === user.username) {
        const uName = (user.username || '').toLowerCase();
        if (uName !== currentUserId && user.userId.toLowerCase() !== currentUserId) {
          const dName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
          if (uName.includes(q) || dName.includes(q)) {
            if (!resultsMap.has(uName)) {
              resultsMap.set(uName, {
                userId: user.username,
                username: user.username,
                displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
                avatarUrl: user.avatarUrl || '',
                bio: user.bio || '',
                isOnline: (userSockets.get(user.username)?.size || 0) > 0
              });
            }
          }
        }
      }
    }

    return res.json({ users: Array.from(resultsMap.values()) });
  } catch (err) {
    console.error('[User Search Error]', err);
    return res.status(500).json({ error: 'Ошибка поиска пользователей' });
  }
});

// =============================================================================
// 💬 SOCKET.IO REAL-TIME CHAT & SUPABASE DATABASE SYNC
// =============================================================================

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e8 // 100MB max packet size
});

const AUTH_KEYS = {
  'vladpass': 'vlad',
  'anyapass': 'anya',
  'mompass': 'mom',
  'dadpass': 'dad',
  'sispass': 'sister'
};

// Dynamic Room Store
const memoryRooms = new Map();

const DEFAULT_ROOMS = [
  { id: 'family', name: 'Семья', type: 'group', participants: ['vlad', 'mom', 'dad', 'sister'] },
  { id: 'girlfriend', name: 'Аня', type: 'direct', participants: ['vlad', 'anya'] },
  { id: 'mom-dm', name: 'Мама', type: 'direct', participants: ['vlad', 'mom'] },
  { id: 'dad-dm', name: 'Папа', type: 'direct', participants: ['vlad', 'dad'] },
  { id: 'sister-dm', name: 'Сестра', type: 'direct', participants: ['vlad', 'sister'] },
  { id: 'mom-dad-dm', name: 'Папа', type: 'direct', participants: ['mom', 'dad'] },
  { id: 'mom-sister-dm', name: 'Сестра', type: 'direct', participants: ['mom', 'sister'] },
  { id: 'dad-sister-dm', name: 'Сестра', type: 'direct', participants: ['dad', 'sister'] }
];
DEFAULT_ROOMS.forEach((r) => memoryRooms.set(r.id, r));

function getUserRooms(userId) {
  const rooms = [];
  const cleanUser = (userId || '').toLowerCase();

  // Always include personal Saved Messages
  rooms.push({
    id: 'saved-messages',
    name: 'Избранное',
    type: 'direct',
    participants: [cleanUser]
  });

  for (const r of memoryRooms.values()) {
    if (r.id === 'saved-messages') continue;
    const parts = (r.participants || []).map((p) => p.toLowerCase());
    if (parts.includes(cleanUser)) {
      if (r.type === 'direct' && r.participants.length === 2) {
        const otherUser = r.participants.find((p) => p.toLowerCase() !== cleanUser) || cleanUser;
        const otherDoc = memoryUsers.get(otherUser.toLowerCase());
        const otherName = otherDoc
          ? (`${otherDoc.firstName || ''} ${otherDoc.lastName || ''}`.trim() || otherDoc.username)
          : (r.name || otherUser);
        rooms.push({
          ...r,
          name: otherName,
          avatarUrl: otherDoc?.avatarUrl || r.avatarUrl || ''
        });
      } else {
        rooms.push(r);
      }
    }
  }

  return rooms;
}

async function loadRoomsFromSupabase() {
  try {
    const { data: dbRooms, error } = await supabase
      .from('rooms')
      .select('id, name, type, avatar_url, room_members(user_id, users(username))');

    if (!error && dbRooms) {
      for (const r of dbRooms) {
        if (r.name === 'Избранное') continue;
        const participants = (r.room_members || []).map((m) => m.users?.username || m.user_id).filter(Boolean);
        if (participants.length > 0) {
          let roomId = r.id;
          if (r.name === 'Семья') roomId = 'family';
          else if (r.name === 'Аня' && r.type === 'direct') roomId = 'girlfriend';
          else if (r.name === 'Мама' && r.type === 'direct') roomId = 'mom-dm';
          else if (r.name === 'Папа' && r.type === 'direct') roomId = 'dad-dm';
          else if (r.name === 'Сестра' && r.type === 'direct') roomId = 'sister-dm';

          memoryRooms.set(roomId, {
            id: roomId,
            dbId: r.id,
            name: r.name,
            type: r.type,
            participants,
            avatarUrl: r.avatar_url || ''
          });
        }
      }
      console.log(`[Supabase Rooms] Loaded rooms into cache (Total rooms: ${memoryRooms.size}).`);
    }
  } catch (err) {
    console.warn('[Supabase Rooms Warning] Could not load rooms from Supabase:', err.message);
  }
}
loadRoomsFromSupabase();

const userSockets = new Map();
const socketToUser = new Map();

function getOnlineStatus() {
  const status = {};
  for (const [u, sockets] of userSockets.entries()) {
    status[u] = (sockets?.size || 0) > 0;
  }
  return status;
}

// In-Memory message cache synchronized with Supabase
let messageHistory = [];

// ===== Stories (In-Memory, 24h lifetime) =====
const _STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;
const storiesStore = new Map(); // userId -> Story[]

function pruneExpiredStories() {
  const now = Date.now();
  for (const [userId, list] of storiesStore.entries()) {
    const alive = list.filter((s) => s.expiresAt > now);
    if (alive.length === 0) storiesStore.delete(userId);
    else if (alive.length !== list.length) storiesStore.set(userId, alive);
  }
}

function getStoriesState() {
  pruneExpiredStories();
  const state = {};
  for (const [userId, list] of storiesStore.entries()) {
    state[userId] = list;
  }
  return state;
}

// Helper: Load initial messages from Supabase PostgreSQL
async function loadMessagesFromSupabase() {
  try {
    const { data: rawMessages, error: msgErr } = await supabase
      .from('messages')
      .select('*, rooms:room_id(name), users:sender_id(username)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(200);

    if (msgErr || !rawMessages) {
      console.warn('[Supabase Sync] Could not fetch remote messages, using memory cache:', msgErr?.message);
      return;
    }

    const msgIds = rawMessages.map((m) => m.id);
    const [attRes, reactRes] = await Promise.all([
      msgIds.length > 0 ? supabase.from('message_attachments').select('*').in('message_id', msgIds) : { data: [] },
      msgIds.length > 0 ? supabase.from('message_reactions').select('*').in('message_id', msgIds) : { data: [] }
    ]);

    const attachments = attRes.data || [];
    const reactions = reactRes.data || [];

    // Map to client schema
    const loaded = rawMessages.reverse().map((m) => {
      const roomName = m.rooms?.name || 'family';
      const senderName = m.users?.username || 'vlad';

      let roomId = 'family';
      if (roomName === 'Аня') roomId = 'girlfriend';
      else if (roomName === 'Мама') roomId = 'mom-dm';
      else if (roomName === 'Папа') roomId = 'dad-dm';
      else if (roomName === 'Сестра') roomId = 'sister-dm';

      const att = attachments.find((a) => a.message_id === m.id);
      const msgReactions = {};
      reactions.filter((r) => r.message_id === m.id).forEach((r) => {
        if (!msgReactions[r.emoji]) msgReactions[r.emoji] = [];
        msgReactions[r.emoji].push(r.user_id);
      });

      let fileType = 'file';
      if (att) {
        const mime = (att.file_type || '').toLowerCase();
        const fName = (att.file_name || '').toLowerCase();
        const fUrl = (att.file_url || '').toLowerCase();
        if (
          mime === 'sticker' || 
          fName.endsWith('.tgs') || 
          fUrl.endsWith('.tgs') || 
          fUrl.includes('sticker') || 
          fName.startsWith('sticker_') ||
          fName.includes('уточка') ||
          fName.includes('вишенка') ||
          fName.includes('stonks') ||
          fName.includes('бокс') ||
          fName.includes('пепе') ||
          fName.includes('колобок')
        ) {
          fileType = 'sticker';
        } else if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|heic)$/i.test(fName)) {
          fileType = 'image';
        } else if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|opus)$/i.test(fName) || fName.startsWith('голосовое сообщение')) {
          fileType = 'audio';
        } else if (mime.startsWith('video/') || mime === 'video_note' || /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(fName) || fName.includes('кружок')) {
          fileType = fName.includes('кружок') || mime === 'video_note' ? 'video_note' : 'video';
        }
      }

      let messageText = m.content || '';
      if (att && (messageText === `📎 ${att.file_name}` || messageText === `📎  ${att.file_name}` || messageText === att.file_name)) {
        messageText = '';
      }

      return {
        id: m.id,
        roomId,
        sender: senderName,
        text: messageText,
        timestamp: new Date(m.created_at).getTime(),
        replyToId: m.reply_to_id || undefined,
        file: att ? {
          name: att.file_name,
          type: fileType,
          data: att.file_url,
          size: att.file_size || 0
        } : undefined,
        reactions: Object.keys(msgReactions).length > 0 ? msgReactions : undefined,
        isEdited: !!m.edited_at,
        readBy: []
      };
    });

    messageHistory = loaded;
    console.log(`[Supabase Sync] Successfully loaded ${loaded.length} messages from PostgreSQL database.`);
  } catch (err) {
    console.error('[Supabase Sync Error]', err);
  }
}

// Initial fetch from Supabase
loadMessagesFromSupabase();

// Helpers for safe UUID queries
const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

async function resolveUserUuid(usernameOrId) {
  if (isUuid(usernameOrId)) return usernameOrId;
  const { data } = await supabase.from('users').select('id').eq('username', usernameOrId).maybeSingle();
  return data?.id || null;
}

async function resolveRoomUuid(roomIdOrName) {
  if (isUuid(roomIdOrName)) return roomIdOrName;
  let targetName = roomIdOrName;
  if (roomIdOrName === 'girlfriend') targetName = 'Аня';
  else if (roomIdOrName === 'family') targetName = 'Семья';
  else if (roomIdOrName === 'mom-dm') targetName = 'Мама';
  else if (roomIdOrName === 'dad-dm') targetName = 'Папа';
  else if (roomIdOrName === 'sister-dm') targetName = 'Сестра';

  const { data } = await supabase.from('rooms').select('id').eq('name', targetName).maybeSingle();
  return data?.id || null;
}

// Periodically prune expired stories every 10 minutes
setInterval(pruneExpiredStories, 10 * 60 * 1000);

// Socket.io Connection Handler
io.on('connection', async (socket) => {
  const tokenOrKey = socket.handshake.auth?.token || socket.handshake.query?.token;
  let user = null;

  if (tokenOrKey) {
    try {
      const decoded = jwt.verify(tokenOrKey, JWT_ACCESS_SECRET);
      if (decoded && decoded.userId) {
        user = decoded.userId;
      }
    } catch {
      user = AUTH_KEYS[tokenOrKey] || null;
    }
  }

  if (!user) {
    console.log(`[Server] Unauthorized connection attempt: ${socket.id}`);
    socket.emit('auth_error', { message: 'Сессия недействительна. Пожалуйста, выполните вход.' });
    socket.disconnect(true);
    return;
  }

  if (!userSockets.has(user)) {
    userSockets.set(user, new Set());
  }

  socketToUser.set(socket.id, user);
  userSockets.get(user).add(socket.id);
  socket.join(user); // Личная комната для прямых оповещений

  console.log(`[Server] User connected: ${user} (Socket: ${socket.id}, Devices: ${userSockets.get(user).size})`);

  // Динамическая проверка доступа к комнатам
  const isRoomAllowedForUser = (roomId, targetUser) => {
    if (!roomId) return false;
    if (roomId === 'saved-messages') return true;
    const cleanTarget = (targetUser || '').toLowerCase();
    const r = memoryRooms.get(roomId);
    if (r && r.participants && r.participants.map((p) => p.toLowerCase()).includes(cleanTarget)) {
      return true;
    }
    if (roomId.startsWith('dm-') && roomId.includes(cleanTarget)) {
      return true;
    }
    return false;
  };

  // Подключение к персональным комнатам пользователя
  const userRooms = getUserRooms(user);
  userRooms.forEach((roomIdObj) => {
    socket.join(roomIdObj.id);
  });

  // Отправка персонального списка комнат клиенту
  socket.emit('rooms_list', userRooms);

  // Broadcast presence
  io.emit('status_update', getOnlineStatus());

  // 0. Запрос списка комнат
  socket.on('get_user_rooms', (callback) => {
    const rooms = getUserRooms(user);
    if (typeof callback === 'function') callback(rooms);
    else socket.emit('rooms_list', rooms);
  });

  // 0.1. Поиск пользователей в реальном времени
  socket.on('search_users', async ({ query }, callback) => {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      if (typeof callback === 'function') callback({ users: [] });
      return;
    }
    const resultsMap = new Map();
    try {
      const { data: dbUsers } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, bio, is_active')
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(25);
      if (dbUsers) {
        dbUsers.forEach((u) => {
          const uName = (u.username || '').toLowerCase();
          if (uName !== user.toLowerCase() && u.id !== user) {
            resultsMap.set(uName, {
              userId: u.username,
              username: u.username,
              displayName: u.display_name || u.username,
              avatarUrl: u.avatar_url || '',
              bio: u.bio || '',
              isOnline: (userSockets.get(u.username)?.size || 0) > 0
            });
          }
        });
      }
    } catch {
      // Supabase search fallback
    }

    for (const [key, u] of memoryUsers.entries()) {
      if (typeof key === 'string' && key === u.username && u.username.toLowerCase() !== user.toLowerCase()) {
        const uName = (u.username || '').toLowerCase();
        const dName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        if (uName.includes(q) || dName.includes(q)) {
          if (!resultsMap.has(uName)) {
            resultsMap.set(uName, {
              userId: u.username,
              username: u.username,
              displayName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
              avatarUrl: u.avatarUrl || '',
              bio: u.bio || '',
              isOnline: (userSockets.get(u.username)?.size || 0) > 0
            });
          }
        }
      }
    }
    const list = Array.from(resultsMap.values());
    if (typeof callback === 'function') callback({ users: list });
    else socket.emit('search_users_result', { users: list });
  });

  // 0.2. Создание или открытие личного диалога 1-на-1
  socket.on('create_direct_chat', async ({ targetUserId }, callback) => {
    if (!targetUserId || targetUserId.toLowerCase() === user.toLowerCase()) {
      if (typeof callback === 'function') callback({ error: 'Неверный адресат' });
      return;
    }
    const cleanTarget = targetUserId.toLowerCase();
    const cleanUser = user.toLowerCase();

    // Проверяем, существует ли уже диалог между этими пользователями
    let existing = null;
    for (const r of memoryRooms.values()) {
      if (r.type === 'direct' && r.participants && r.participants.length === 2) {
        const p1 = r.participants[0].toLowerCase();
        const p2 = r.participants[1].toLowerCase();
        if ((p1 === cleanUser && p2 === cleanTarget) || (p1 === cleanTarget && p2 === cleanUser)) {
          existing = r;
          break;
        }
      }
    }

    if (existing) {
      socket.join(existing.id);
      const targetDoc = memoryUsers.get(cleanTarget);
      const returnRoom = {
        ...existing,
        name: targetDoc ? (`${targetDoc.firstName || ''} ${targetDoc.lastName || ''}`.trim() || targetDoc.username) : existing.name,
        avatarUrl: targetDoc?.avatarUrl || existing.avatarUrl || ''
      };
      if (typeof callback === 'function') callback({ room: returnRoom });
      socket.emit('room_created', returnRoom);
      return;
    }

    // Создаем новый личный чат
    const targetDoc = memoryUsers.get(cleanTarget);
    const targetDisplayName = targetDoc ? (`${targetDoc.firstName || ''} ${targetDoc.lastName || ''}`.trim() || targetDoc.username) : cleanTarget;
    const currentDoc = memoryUsers.get(cleanUser);
    const currentDisplayName = currentDoc ? (`${currentDoc.firstName || ''} ${currentDoc.lastName || ''}`.trim() || currentDoc.username) : cleanUser;

    const sorted = [cleanUser, cleanTarget].sort();
    const roomId = `dm-${sorted[0]}-${sorted[1]}`;

    const newRoom = {
      id: roomId,
      name: targetDisplayName,
      type: 'direct',
      participants: [cleanUser, cleanTarget],
      avatarUrl: targetDoc?.avatarUrl || ''
    };

    memoryRooms.set(roomId, newRoom);

    // Подключаем сокеты обоих участников
    socket.join(roomId);
    if (userSockets.has(cleanUser)) {
      userSockets.get(cleanUser).forEach((sId) => io.sockets.sockets.get(sId)?.join(roomId));
    }
    if (userSockets.has(cleanTarget)) {
      userSockets.get(cleanTarget).forEach((sId) => io.sockets.sockets.get(sId)?.join(roomId));
    }

    // Сохраняем в Supabase в фоне
    (async () => {
      try {
        const u1Uuid = await resolveUserUuid(cleanUser);
        const u2Uuid = await resolveUserUuid(cleanTarget);
        if (u1Uuid && u2Uuid) {
          const { data: dbRoom } = await supabase.from('rooms').insert({
            name: `${cleanUser} & ${cleanTarget}`,
            type: 'direct',
            created_by: u1Uuid
          }).select().single();
          if (dbRoom) {
            newRoom.dbId = dbRoom.id;
            await supabase.from('room_members').insert([
              { room_id: dbRoom.id, user_id: u1Uuid, role: 'admin' },
              { room_id: dbRoom.id, user_id: u2Uuid, role: 'member' }
            ]);
          }
        }
      } catch (err) {
        console.warn('[Supabase Direct Room Error]', err.message);
      }
    })();

    if (typeof callback === 'function') callback({ room: newRoom });
    socket.emit('room_created', newRoom);

    // Оповещаем собеседника с отображением имени текущего пользователя
    const roomForTarget = {
      ...newRoom,
      name: currentDisplayName,
      avatarUrl: currentDoc?.avatarUrl || ''
    };
    io.to(cleanTarget).emit('room_created', roomForTarget);
  });

  // 0.3. Создание группы
  socket.on('create_group_chat', async ({ name, participantIds, avatarUrl }, callback) => {
    if (!name || !name.trim()) {
      if (typeof callback === 'function') callback({ error: 'Укажите название группы' });
      return;
    }
    const cleanMembers = Array.from(new Set([user.toLowerCase(), ...(participantIds || []).map((p) => p.toLowerCase())]));
    const roomId = `group-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newGroup = {
      id: roomId,
      name: name.trim(),
      type: 'group',
      participants: cleanMembers,
      avatarUrl: avatarUrl || ''
    };

    memoryRooms.set(roomId, newGroup);

    cleanMembers.forEach((memberId) => {
      if (userSockets.has(memberId)) {
        userSockets.get(memberId).forEach((sId) => io.sockets.sockets.get(sId)?.join(roomId));
      }
      io.to(memberId).emit('room_created', newGroup);
    });

    // Сохранение группы в Supabase
    (async () => {
      try {
        const creatorUuid = await resolveUserUuid(user);
        if (creatorUuid) {
          const { data: dbRoom } = await supabase.from('rooms').insert({
            name: name.trim(),
            type: 'group',
            created_by: creatorUuid,
            avatar_url: avatarUrl || ''
          }).select().single();
          if (dbRoom) {
            newGroup.dbId = dbRoom.id;
            const memberInserts = [];
            for (const m of cleanMembers) {
              const mUuid = await resolveUserUuid(m);
              if (mUuid) {
                memberInserts.push({
                  room_id: dbRoom.id,
                  user_id: mUuid,
                  role: m === user.toLowerCase() ? 'admin' : 'member'
                });
              }
            }
            if (memberInserts.length > 0) {
              await supabase.from('room_members').insert(memberInserts);
            }
          }
        }
      } catch (err) {
        console.warn('[Supabase Group Save Warning]', err.message);
      }
    })();

    if (typeof callback === 'function') callback({ room: newGroup });
  });

  // Send message history
  const userHistory = messageHistory.filter((msg) => isRoomAllowedForUser(msg.roomId, user));
  socket.emit('history', userHistory);

  // Send current active stories
  socket.emit('stories_state', getStoriesState());

  // 1. SEND MESSAGE (Synchronized with Supabase)
  socket.on('send_message', async (data) => {
    if (data.sender !== user) return;
    if (!isRoomAllowedForUser(data.roomId, user)) return;

    socket.join(data.roomId);
    if (data.roomId.startsWith('dm-')) {
      const parts = data.roomId.replace('dm-', '').split('-');
      const otherUser = parts.find((p) => p !== user);
      if (otherUser && userSockets.has(otherUser)) {
        userSockets.get(otherUser).forEach((sockId) => {
          const s = io.sockets.sockets.get(sockId);
          if (s) s.join(data.roomId);
        });
      }
    }

    const hasMeaningfulContent = Boolean(
      (data.text && String(data.text).trim().length > 0) ||
      data.file ||
      data.forwardedFrom ||
      data.poll ||
      data.sticker
    );
    if (!hasMeaningfulContent) return;

    let finalFile = data.file;

    // Process file upload if needed (skip stickers and SVG data URIs)
    if (
      finalFile &&
      finalFile.data &&
      finalFile.data.startsWith('data:') &&
      finalFile.type !== 'sticker' &&
      !finalFile.data.startsWith('data:image/svg+xml')
    ) {
      try {
        let base64Data = finalFile.data;
        const marker = ';base64,';
        const markerIndex = base64Data.indexOf(marker);
        if (markerIndex !== -1) {
          base64Data = base64Data.substring(markerIndex + marker.length);
        } else {
          base64Data = base64Data.replace(/^data:.*?,/, '');
        }
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = path.extname(finalFile.name || '') || (finalFile.type === 'audio' ? '.webm' : '.bin');
        const uniqueName = `fallback-${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
        const filePath = path.join(UPLOADS_DIR, uniqueName);
        fs.writeFileSync(filePath, buffer);

        finalFile = {
          ...finalFile,
          data: `/uploads/${uniqueName}`
        };
      } catch (err) {
        console.error('[Server] Failed to process base64 file:', err);
      }
    }

    const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    const messageId = (data.id && isUuid(data.id))
      ? data.id
      : (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 9));

    const newMessage = {
      id: messageId,
      roomId: data.roomId,
      sender: user,
      text: data.text || '',
      timestamp: data.timestamp || Date.now(),
      replyToId: data.replyToId || undefined,
      forwardedFrom: data.forwardedFrom || undefined,
      file: finalFile || undefined,
      poll: data.poll || undefined,
      readBy: []
    };

    messageHistory.push(newMessage);
    if (messageHistory.length > 1000) {
      messageHistory.shift();
    }

    // Broadcast instantly over Socket.io
    io.to(data.roomId).emit('receive_message', newMessage);

    // Asynchronously persist into Supabase PostgreSQL
    (async () => {
      try {
        const senderUuid = await resolveUserUuid(user);
        const roomUuid = await resolveRoomUuid(data.roomId);

        if (senderUuid && roomUuid) {
          const insertPayload = {
            room_id: roomUuid,
            sender_id: senderUuid,
            content: data.text || '',
          };
          if (isUuid(messageId)) {
            insertPayload.id = messageId;
          }
          if (data.replyToId && isUuid(data.replyToId)) {
            insertPayload.reply_to_id = data.replyToId;
          }

          const { data: insertedMsg, error: insErr } = await supabase
            .from('messages')
            .insert(insertPayload)
            .select()
            .single();

          if (insertedMsg && finalFile) {
            await supabase.from('message_attachments').insert({
              message_id: insertedMsg.id,
              file_url: finalFile.data,
              file_name: finalFile.name || 'file',
              file_type: finalFile.type || 'file',
              file_size: finalFile.size || 0,
            });
          }

          if (insErr) {
            console.warn('[Supabase Sync Warning]', insErr.message);
          }
        }
      } catch (sbErr) {
        console.error('[Supabase Message Persist Error]', sbErr);
      }
    })();
  });

  // 2. EDIT MESSAGE (Synchronized with Supabase)
  socket.on('edit_message', async ({ messageId, roomId, newText }) => {
    if (!isRoomAllowedForUser(roomId, user)) return;
    const msgIndex = messageHistory.findIndex((m) => m.id === messageId && m.roomId === roomId);
    if (msgIndex === -1 || messageHistory[msgIndex].sender !== user) return;

    messageHistory[msgIndex].text = newText;
    messageHistory[msgIndex].isEdited = true;

    io.to(roomId).emit('message_edited', { messageId, roomId, newText });

    if (isUuid(messageId)) {
      supabase.from('messages').update({
        content: newText,
        edited_at: new Date().toISOString()
      }).eq('id', messageId).then(({ error }) => {
        if (error) console.warn('[Supabase Edit Warning]', error.message);
      }).catch((e) => console.warn('[Supabase Edit Warning]', e));
    }
  });

  // 3. DELETE MESSAGE (Synchronized with Supabase & Telegram 1:1 "Delete for everyone")
  socket.on('delete_message', async ({ messageId, roomId }) => {
    if (!isRoomAllowedForUser(roomId, user)) return;
    const msgIndex = messageHistory.findIndex((m) => m.id === messageId && m.roomId === roomId);
    if (msgIndex === -1) return;

    messageHistory.splice(msgIndex, 1);
    io.to(roomId).emit('message_deleted', { messageId, roomId });

    if (isUuid(messageId)) {
      supabase.from('messages').update({
        deleted_at: new Date().toISOString()
      }).eq('id', messageId).then(({ error }) => {
        if (error) console.warn('[Supabase Delete Warning]', error.message);
      }).catch((e) => console.warn('[Supabase Delete Warning]', e));
    }
  });

  // 4. TOGGLE REACTION (Synchronized with Supabase)
  socket.on('toggle_reaction', async ({ messageId, roomId, reaction }) => {
    if (!isRoomAllowedForUser(roomId, user)) return;
    const msgIndex = messageHistory.findIndex((m) => m.id === messageId && m.roomId === roomId);
    if (msgIndex === -1) return;

    const msg = messageHistory[msgIndex];
    if (!msg.reactions) msg.reactions = {};

    const reactors = msg.reactions[reaction] || [];
    const reactorIndex = reactors.indexOf(user);

    if (reactorIndex === -1) {
      reactors.push(user);
    } else {
      reactors.splice(reactorIndex, 1);
    }

    if (reactors.length === 0) {
      delete msg.reactions[reaction];
    } else {
      msg.reactions[reaction] = reactors;
    }

    io.to(roomId).emit('reactions_updated', { messageId, roomId, reactions: msg.reactions });

    // Sync reaction in Supabase
    (async () => {
      try {
        const userUuid = await resolveUserUuid(user);
        if (userUuid && isUuid(messageId)) {
          if (reactorIndex === -1) {
            await supabase.from('message_reactions').insert({
              message_id: messageId,
              user_id: userUuid,
              emoji: reaction
            });
          } else {
            await supabase.from('message_reactions').delete()
              .eq('message_id', messageId)
              .eq('user_id', userUuid)
              .eq('emoji', reaction);
          }
        }
      } catch (e) {
        console.warn('[Supabase Reaction Sync]', e);
      }
    })();
  });

  // 4b. POLL VOTE (In-memory with broadcast)
  socket.on('vote_poll', ({ messageId, roomId, optionIds }) => {
    if (!isRoomAllowedForUser(roomId, user)) return;
    const msg = messageHistory.find((m) => m.id === messageId && m.roomId === roomId);
    if (!msg || !msg.poll || msg.poll.closed) return;
    if (!msg.poll.votes) msg.poll.votes = {};

    // In Quiz mode, votes cannot be changed or retracted once submitted
    const isQuiz = Boolean(msg.poll.quiz);
    const hasAlreadyVoted = Object.values(msg.poll.votes).some((voters) => voters.includes(user));
    if (isQuiz && hasAlreadyVoted) return;

    let ids = Array.isArray(optionIds) ? optionIds : [optionIds].filter(Boolean);
    if ((isQuiz || !msg.poll.multiple) && ids.length > 1) {
      ids = ids.slice(0, 1);
    }

    // Remove user from all options first
    Object.keys(msg.poll.votes).forEach((optId) => {
      msg.poll.votes[optId] = (msg.poll.votes[optId] || []).filter((voter) => voter !== user);
      if (msg.poll.votes[optId].length === 0) delete msg.poll.votes[optId];
    });

    // Apply new votes
    ids.forEach((optionId) => {
      if (!msg.poll.options.some((o) => o.id === optionId)) return;
      if (!msg.poll.votes[optionId]) msg.poll.votes[optionId] = [];
      if (!msg.poll.votes[optionId].includes(user)) {
        msg.poll.votes[optionId].push(user);
      }
    });

    io.to(roomId).emit('poll_updated', { messageId, roomId, poll: msg.poll });
  });

  // 4c. POLL CLOSE (author only, broadcast)
  socket.on('close_poll', ({ messageId, roomId }) => {
    if (!isRoomAllowedForUser(roomId, user)) return;
    const msg = messageHistory.find((m) => m.id === messageId && m.roomId === roomId);
    if (!msg || !msg.poll || msg.poll.closed) return;
    if (msg.sender !== user) return;

    msg.poll.closed = true;
    io.to(roomId).emit('poll_updated', { messageId, roomId, poll: msg.poll });
  });

  // 4d. STORIES HANDLERS (Real-time ephemeral stories with Telegram 3.0 capabilities)
  socket.on('send_story', (payload) => {
    if (!payload || !payload.data) return;
    pruneExpiredStories();
    const {
      type = 'text',
      data,
      caption,
      background,
      fontStyle,
      textColor,
      textBgStyle,
      authorName,
      durationHours = 24,
      privacy = 'everyone',
      isPinned = false,
      isCloseFriends = false,
      textOverlays,
      stickerOverlays,
      drawingData
    } = payload;

    const lifetimeMs = Math.max(1, Number(durationHours) || 24) * 60 * 60 * 1000;
    const storyId = payload.id || ('story-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7));

    const userStories = storiesStore.get(user) || [];
    // Deduplicate if already present
    if (userStories.some((s) => s.id === storyId)) {
      return;
    }

    const story = {
      id: storyId,
      userId: user,
      authorName: authorName || user,
      type,
      data,
      caption: caption || undefined,
      background: background || undefined,
      fontStyle: fontStyle || undefined,
      textColor: textColor || undefined,
      textBgStyle: textBgStyle || undefined,
      timestamp: Date.now(),
      views: [],
      reactions: {},
      durationHours: Number(durationHours) || 24,
      privacy,
      isPinned: Boolean(isPinned),
      isCloseFriends: Boolean(isCloseFriends),
      textOverlays: Array.isArray(textOverlays) ? textOverlays : undefined,
      stickerOverlays: Array.isArray(stickerOverlays) ? stickerOverlays : undefined,
      drawingData: drawingData || undefined,
      expiresAt: isPinned ? Date.now() + 365 * 24 * 60 * 60 * 1000 : Date.now() + lifetimeMs
    };

    userStories.push(story);
    if (userStories.length > 50) userStories.shift();
    storiesStore.set(user, userStories);

    io.emit('stories_state', getStoriesState());
  });

  socket.on('delete_story', ({ storyId }) => {
    if (!storyId) return;
    const userStories = storiesStore.get(user) || [];
    const filtered = userStories.filter((s) => s.id !== storyId);
    if (filtered.length === 0) {
      storiesStore.delete(user);
    } else {
      storiesStore.set(user, filtered);
    }
    io.emit('stories_state', getStoriesState());
  });

  socket.on('view_story', ({ storyId, storyAuthor }) => {
    if (!storyId || !storyAuthor) return;
    const authorStories = storiesStore.get(storyAuthor);
    if (!authorStories) return;
    const story = authorStories.find((s) => s.id === storyId);
    if (!story) return;
    if (!story.views.includes(user)) {
      story.views.push(user);
      io.emit('stories_state', getStoriesState());
    }
  });

  socket.on('react_story', ({ storyId, storyAuthor, emoji }) => {
    if (!storyId || !storyAuthor || !emoji) return;
    const authorStories = storiesStore.get(storyAuthor);
    if (!authorStories) return;
    const story = authorStories.find((s) => s.id === storyId);
    if (!story) return;
    if (!story.reactions) story.reactions = {};
    if (!story.reactions[emoji]) story.reactions[emoji] = [];
    if (!story.reactions[emoji].includes(user)) {
      story.reactions[emoji].push(user);
    }
    if (!story.views.includes(user)) {
      story.views.push(user);
    }
    io.emit('stories_state', getStoriesState());
  });

  // 5. MARK AS READ (Synchronized with Supabase)
  socket.on('mark_read', async ({ roomId, messageIds }) => {
    if (!isRoomAllowedForUser(roomId, user) || !Array.isArray(messageIds)) return;

    const updatedMessages = [];
    messageIds.forEach((messageId) => {
      const msgIndex = messageHistory.findIndex((m) => m.id === messageId && m.roomId === roomId);
      if (msgIndex === -1) return;

      const msg = messageHistory[msgIndex];
      if (msg.sender === user) return;

      if (!msg.readBy) msg.readBy = [];
      if (!msg.readBy.includes(user)) {
        msg.readBy.push(user);
        updatedMessages.push({ messageId, readBy: msg.readBy });
      }
    });

    if (updatedMessages.length > 0) {
      io.to(roomId).emit('messages_read', { roomId, updatedMessages });

      // Sync read receipts in Supabase
      (async () => {
        try {
          const userUuid = await resolveUserUuid(user);
          if (userUuid) {
            const validUuids = messageIds.filter(isUuid);
            if (validUuids.length > 0) {
              const records = validUuids.map((id) => ({
                message_id: id,
                user_id: userUuid,
                read_at: new Date().toISOString()
              }));
              await supabase.from('message_read_receipts').upsert(records, { onConflict: 'message_id, user_id' });
            }
          }
        } catch (e) {
          console.warn('[Supabase Read Sync]', e);
        }
      })();
    }
  });

  // 6. TYPING INDICATORS
  socket.on('typing', ({ roomId, isTyping }) => {
    if (!isRoomAllowedForUser(roomId, user)) return;
    socket.to(roomId).emit('typing_update', {
      roomId,
      username: user,
      isTyping
    });
  });

  // 7. WEBRTC CALLING HANDLERS
  socket.on('call_user', ({ roomId, type }) => {
    if (!isRoomAllowedForUser(roomId, user)) return;
    socket.to(roomId).emit('call_incoming', {
      roomId,
      caller: user,
      callerSocketId: socket.id,
      type
    });
  });

  socket.on('call_accept', ({ roomId, targetSocketId }) => {
    if (!isRoomAllowedForUser(roomId, user)) return;
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_accepted', { roomId, targetSocketId: socket.id });
    } else {
      socket.to(roomId).emit('call_accepted', { roomId, targetSocketId: socket.id });
    }
  });

  socket.on('call_reject', ({ roomId, targetSocketId }) => {
    if (!isRoomAllowedForUser(roomId, user)) return;
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_rejected', { roomId });
    } else {
      socket.to(roomId).emit('call_rejected', { roomId });
    }
  });

  socket.on('call_end', ({ roomId, targetSocketId }) => {
    if (!isRoomAllowedForUser(roomId, user)) return;
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_ended', { roomId });
    } else {
      socket.to(roomId).emit('call_ended', { roomId });
    }
  });

  socket.on('webrtc_signal', ({ roomId, targetSocketId, signal }) => {
    if (!isRoomAllowedForUser(roomId, user)) return;
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc_signal', { signal, senderSocketId: socket.id });
    } else {
      socket.to(roomId).emit('webrtc_signal', { signal, senderSocketId: socket.id });
    }
  });

  socket.on('get_status', () => {
    socket.emit('status_update', getOnlineStatus());
  });

  // Initial stories state emission
  socket.emit('stories_state', getStoriesState());

  // Disconnect Handler
  socket.on('disconnect', () => {
    const disconnectedUser = socketToUser.get(socket.id);
    if (disconnectedUser) {
      socketToUser.delete(socket.id);
      const userSocketsSet = userSockets.get(disconnectedUser);
      if (userSocketsSet) {
        userSocketsSet.delete(socket.id);
      }
      console.log(`[Server] User disconnected: ${disconnectedUser} (Socket: ${socket.id})`);
      io.emit('status_update', getOnlineStatus());
    }
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`  🚀 Secure Comms Server Active (Supabase Synced):`);
  console.log(`  - API & WebSockets: http://localhost:${PORT}`);
  console.log(`  - Local Network:    http://192.168.0.9:${PORT}`);
  console.log(`======================================================\n`);
});
