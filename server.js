import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Trust proxy headers for reverse proxies (like Nginx)
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

// Configure static uploads directory
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

function deleteAttachedFile(fileUrl) {
  if (fileUrl && typeof fileUrl === 'string' && fileUrl.startsWith('/uploads/')) {
    const filename = path.basename(fileUrl);
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) console.error(`[Server] Error deleting media file ${filename}:`, err);
        else console.log(`[Server] Successfully cleaned up file: ${filename}`);
      });
    }
  }
}

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

// File Upload endpoint
app.post('/api/upload', (req, res) => {
  uploadMiddleware.single('file')(req, res, (err) => {
    if (err) {
      console.error('[Upload Middleware Error]', err);
      return res.status(400).json({ error: err.message || 'File upload error' });
    }

    if (req.file) {
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
// 🔐 AUTHENTICATION, MONGODB SCHEMAS & JWT CONFIGURATION
// =============================================================================

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'comms_jwt_access_secret_super_secure_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'comms_jwt_refresh_secret_super_secure_key_2026';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/comms_db';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60;
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60;
const BCRYPT_SALT_ROUNDS = 12;

let isMongoConnected = false;

// Connect to MongoDB with graceful fallback
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 3000,
  maxPoolSize: 20
}).then(() => {
  isMongoConnected = true;
  console.log(`✅ [MongoDB] Connected successfully to ${MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@')}`);
}).catch((err) => {
  isMongoConnected = false;
  console.warn(`⚠️ [MongoDB] Connection offline (${err.message}). Using resilient local in-memory auth.`);
});

// --- Mongoose Schemas & Models ---
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true },
  salt: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date, default: null },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  bio: { type: String, default: '' },
  phoneNumber: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  statusEmoji: { type: String, default: '' }
}, { timestamps: true });

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  token: { type: String, required: true },
  refreshToken: { type: String, required: true, unique: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  userAgent: { type: String, default: '' },
  ipAddress: { type: String, default: '' }
}, { timestamps: { createdAt: true, updatedAt: false } });

const loginAttemptSchema = new mongoose.Schema({
  attemptId: { type: String, required: true, unique: true },
  email: { type: String, required: true, lowercase: true, index: true },
  success: { type: Boolean, required: true },
  timestamp: { type: Date, default: Date.now, expires: 30 * 24 * 60 * 60 },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' }
});

const DbUser = mongoose.models.User || mongoose.model('User', userSchema);
const DbSession = mongoose.models.Session || mongoose.model('Session', sessionSchema);
const DbLoginAttempt = mongoose.models.LoginAttempt || mongoose.model('LoginAttempt', loginAttemptSchema);

// In-memory fallback storage for when MongoDB is disconnected during local testing
const memoryUsers = new Map();
const memorySessions = new Map();
const memoryAttempts = [];

// Helper to sanitize user object for client response
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

// Seed default users for instant development login
const SEED_USERS = [
  { userId: 'vlad', email: 'vlad@telegram.org', username: 'vlad', pass: 'vladpass', firstName: 'Влад', lastName: 'Админ', bio: 'Creator of Comms', statusEmoji: '⚡' },
  { userId: 'anya', email: 'anya@telegram.org', username: 'anya', pass: 'anyapass', firstName: 'Аня', lastName: '', bio: 'Designer & Artist', statusEmoji: '🌸' },
  { userId: 'mom', email: 'mom@telegram.org', username: 'mom', pass: 'mompass', firstName: 'Мама', lastName: '', bio: 'Family first ❤️', statusEmoji: '❤️' },
  { userId: 'dad', email: 'dad@telegram.org', username: 'dad', pass: 'dadpass', firstName: 'Папа', lastName: '', bio: 'Engineering & Tech', statusEmoji: '🚀' },
  { userId: 'sister', email: 'sister@telegram.org', username: 'sister', pass: 'sispass', firstName: 'Сестра', lastName: '', bio: 'Music & Books ✨', statusEmoji: '✨' }
];

async function seedDefaultUsers() {
  for (const u of SEED_USERS) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(u.pass, salt);
    
    const userDoc = {
      userId: u.userId,
      email: u.email.toLowerCase(),
      username: u.username.toLowerCase(),
      passwordHash,
      salt,
      isActive: true,
      firstName: u.firstName,
      lastName: u.lastName,
      bio: u.bio,
      statusEmoji: u.statusEmoji,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    memoryUsers.set(u.userId, userDoc);
    memoryUsers.set(u.email.toLowerCase(), userDoc);
    memoryUsers.set(u.username.toLowerCase(), userDoc);

    if (isMongoConnected) {
      try {
        await DbUser.findOneAndUpdate(
          { userId: u.userId },
          { $setOnInsert: userDoc },
          { upsert: true, new: true }
        );
      } catch (err) {
        // Ignored
      }
    }
  }
  console.log(`[Auth] Seeded ${SEED_USERS.length} default users with Bcrypt hashes.`);
}
seedDefaultUsers();

// Token Generation Helper
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

// Check brute-force lock (5 failed attempts in 15 mins)
async function isAccountLocked(email) {
  const windowMs = 15 * 60 * 1000;
  const since = new Date(Date.now() - windowMs);
  const cleanEmail = email.toLowerCase().trim();

  if (isMongoConnected) {
    try {
      const count = await DbLoginAttempt.countDocuments({
        email: cleanEmail,
        success: false,
        timestamp: { $gte: since }
      });
      return count >= 5;
    } catch {
      // Fallback
    }
  }

  const memCount = memoryAttempts.filter(
    (a) => a.email === cleanEmail && !a.success && a.timestamp >= since
  ).length;
  return memCount >= 5;
}

// Log attempt
async function logAttempt(email, success, ipAddress, userAgent) {
  const entry = {
    attemptId: 'att_' + Math.random().toString(36).substring(2, 11),
    email: email.toLowerCase().trim(),
    success,
    timestamp: new Date(),
    ipAddress: ipAddress || '',
    userAgent: userAgent || ''
  };

  memoryAttempts.push(entry);
  if (memoryAttempts.length > 500) memoryAttempts.shift();

  if (isMongoConnected) {
    try {
      await DbLoginAttempt.create(entry);
    } catch {
      // Fallback
    }
  }
}

// Find User by email or username
async function findUserByIdentifier(identifier) {
  const clean = identifier.toLowerCase().trim();
  if (isMongoConnected) {
    try {
      const user = await DbUser.findOne({
        $or: [{ email: clean }, { username: clean }, { userId: clean }]
      });
      if (user) return user;
    } catch {
      // Fallback to memory
    }
  }
  return memoryUsers.get(clean) || null;
}

// =============================================================================
// 🚀 AUTH REST API ENDPOINTS
// =============================================================================

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, username, password, firstName, lastName, bio, phoneNumber } = req.body || {};

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Заполните обязательные поля: Email, Username и Пароль.' });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Укажите корректный адрес электронной почты.' });
    }

    if (username.trim().length < 3) {
      return res.status(400).json({ error: 'Username должен содержать минимум 3 символа.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов.' });
    }

    const existingUser = await findUserByIdentifier(email) || await findUserByIdentifier(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Пользователь с таким Email или Username уже существует.' });
    }

    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = 'usr_' + Math.random().toString(36).substring(2, 9);

    const userDoc = {
      userId,
      email: email.toLowerCase().trim(),
      username: username.toLowerCase().trim(),
      passwordHash,
      salt,
      isActive: true,
      firstName: (firstName || username).trim(),
      lastName: (lastName || '').trim(),
      bio: (bio || '').trim(),
      phoneNumber: (phoneNumber || '').trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: new Date()
    };

    if (isMongoConnected) {
      await DbUser.create(userDoc);
    }
    memoryUsers.set(userId, userDoc);
    memoryUsers.set(userDoc.email, userDoc);
    memoryUsers.set(userDoc.username, userDoc);

    // Register user for room broadcasting
    if (!USER_ROOMS[userId]) {
      USER_ROOMS[userId] = ['family'];
    }
    if (!ALL_USERS.includes(userId)) {
      ALL_USERS.push(userId);
      userSockets.set(userId, new Set());
    }

    const sessionId = 'sess_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    const { tokens, expiresAt } = generateTokenPair(userDoc, sessionId);

    const sessionDoc = {
      sessionId,
      userId,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt,
      userAgent: req.headers['user-agent'] || '',
      ipAddress: req.ip || ''
    };

    if (isMongoConnected) {
      await DbSession.create(sessionDoc);
    }
    memorySessions.set(sessionId, sessionDoc);
    memorySessions.set(tokens.refreshToken, sessionDoc);

    return res.status(201).json({
      user: sanitizeUser(userDoc),
      tokens,
      session: { sessionId, expiresAt }
    });
  } catch (err) {
    console.error('[Auth Register Error]', err);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера при регистрации.' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const ipAddress = req.ip || '';
    const userAgent = req.headers['user-agent'] || '';

    if (!email || !password) {
      return res.status(400).json({ error: 'Введите логин/Email и пароль.' });
    }

    if (await isAccountLocked(email)) {
      return res.status(429).json({
        error: 'Слишком много неудачных попыток входа. Аккаунт временно заблокирован на 15 минут.'
      });
    }

    const user = await findUserByIdentifier(email);
    if (!user) {
      await logAttempt(email, false, ipAddress, userAgent);
      return res.status(401).json({ error: 'Неверный логин или пароль.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await logAttempt(email, false, ipAddress, userAgent);
      return res.status(401).json({ error: 'Неверный логин или пароль.' });
    }

    await logAttempt(email, true, ipAddress, userAgent);

    // Update lastLogin
    user.lastLogin = new Date();
    if (isMongoConnected) {
      await DbUser.updateOne({ userId: user.userId }, { lastLogin: user.lastLogin });
    }

    // Register user in active pools
    if (!USER_ROOMS[user.userId]) {
      USER_ROOMS[user.userId] = ['family'];
    }
    if (!ALL_USERS.includes(user.userId)) {
      ALL_USERS.push(user.userId);
      if (!userSockets.has(user.userId)) userSockets.set(user.userId, new Set());
    }

    const sessionId = 'sess_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    const { tokens, expiresAt } = generateTokenPair(user, sessionId);

    const sessionDoc = {
      sessionId,
      userId: user.userId,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt,
      userAgent,
      ipAddress
    };

    if (isMongoConnected) {
      await DbSession.create(sessionDoc);
    }
    memorySessions.set(sessionId, sessionDoc);
    memorySessions.set(tokens.refreshToken, sessionDoc);

    return res.json({
      user: sanitizeUser(user),
      tokens,
      session: { sessionId, expiresAt }
    });
  } catch (err) {
    console.error('[Auth Login Error]', err);
    return res.status(500).json({ error: 'Ошибка сервера при входе.' });
  }
});

// POST /api/auth/refresh
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token не предоставлен.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Недействительный или просроченный Refresh token.' });
    }

    const user = await findUserByIdentifier(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден.' });
    }

    let session = memorySessions.get(refreshToken);
    if (!session && isMongoConnected) {
      session = await DbSession.findOne({ refreshToken, expiresAt: { $gt: new Date() } });
    }

    if (!session) {
      return res.status(401).json({ error: 'Сессия отозвана или истекла.' });
    }

    const sessionId = session.sessionId || ('sess_' + Math.random().toString(36).substring(2, 11));
    const { tokens, expiresAt } = generateTokenPair(user, sessionId);

    session.token = tokens.accessToken;
    session.refreshToken = tokens.refreshToken;
    session.expiresAt = expiresAt;

    if (isMongoConnected) {
      await DbSession.updateOne({ sessionId }, {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt
      });
    }
    memorySessions.set(tokens.refreshToken, session);

    return res.json({ tokens });
  } catch (err) {
    console.error('[Auth Refresh Error]', err);
    return res.status(500).json({ error: 'Ошибка при обновлении токена.' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (refreshToken) {
      memorySessions.delete(refreshToken);
      if (isMongoConnected) {
        await DbSession.deleteOne({ refreshToken });
      }
    }
    return res.json({ success: true, message: 'Сессия успешно завершена.' });
  } catch (err) {
    console.error('[Auth Logout Error]', err);
    return res.status(500).json({ error: 'Ошибка при выходе.' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Требуется токен авторизации.' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    } catch {
      return res.status(401).json({ error: 'Токен авторизации недействителен или истек.' });
    }

    const user = await findUserByIdentifier(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден.' });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('[Auth Me Error]', err);
    return res.status(500).json({ error: 'Ошибка при получении профиля.' });
  }
});

// =============================================================================
// 💬 SOCKET.IO REAL-TIME CHAT & WEBRTC
// =============================================================================

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e8 // 100MB max packet size
});

// Map secret keys to user IDs (legacy preset support)
const AUTH_KEYS = {
  'vladpass': 'vlad',
  'anyapass': 'anya',
  'mompass': 'mom',
  'dadpass': 'dad',
  'sispass': 'sister'
};

// Map users to rooms they participate in
const USER_ROOMS = {
  vlad: ['family', 'girlfriend', 'mom-dm', 'dad-dm', 'sister-dm'],
  anya: ['girlfriend'],
  mom: ['family', 'mom-dm', 'mom-dad-dm', 'mom-sister-dm'],
  dad: ['family', 'dad-dm', 'mom-dad-dm', 'dad-sister-dm'],
  sister: ['family', 'sister-dm', 'mom-sister-dm', 'dad-sister-dm']
};

const ALL_USERS = ['vlad', 'anya', 'mom', 'dad', 'sister'];

// Multi-device tracking: Map<UserId, Set<socketId>>
const userSockets = new Map();
ALL_USERS.forEach((u) => userSockets.set(u, new Set()));

// Map to keep track of active socket IDs to user IDs
const socketToUser = new Map();

function getOnlineStatus() {
  const status = {};
  for (const u of ALL_USERS) {
    status[u] = (userSockets.get(u)?.size || 0) > 0;
  }
  return status;
}

const MESSAGES_FILE = path.join(__dirname, 'messages.json');

// In-memory message history initialized from persistent storage
let messageHistory = [];
try {
  if (fs.existsSync(MESSAGES_FILE)) {
    const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
    messageHistory = JSON.parse(data);
    console.log(`[Server] Loaded ${messageHistory.length} messages from persistent storage.`);
  }
} catch (err) {
  console.error('[Server] Error loading persistent messages:', err);
}

// Debounced atomic save to prevent file corruption
let saveTimeout = null;
function persistMessages() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    const tmpFile = `${MESSAGES_FILE}.tmp`;
    fs.writeFile(tmpFile, JSON.stringify(messageHistory, null, 2), (err) => {
      if (err) {
        console.error('[Server] Failed to write temp messages file:', err);
        return;
      }
      fs.rename(tmpFile, MESSAGES_FILE, (renameErr) => {
        if (renameErr) console.error('[Server] Failed to atomically save messages:', renameErr);
      });
    });
  }, 100);
}

// Socket.io Connection & JWT Verification
io.on('connection', async (socket) => {
  const tokenOrKey = socket.handshake.auth?.token || socket.handshake.query?.token;
  let user = null;

  if (tokenOrKey) {
    // 1. Try resolving as JWT Token
    try {
      const decoded = jwt.verify(tokenOrKey, JWT_ACCESS_SECRET);
      if (decoded && decoded.userId) {
        user = decoded.userId;
      }
    } catch {
      // 2. Try resolving as legacy secret key
      user = AUTH_KEYS[tokenOrKey] || null;
    }
  }

  if (!user) {
    console.log(`[Server] Unauthorized connection attempt: ${socket.id}`);
    socket.emit('auth_error', { message: 'Сессия недействительна. Пожалуйста, выполните вход.' });
    socket.disconnect(true);
    return;
  }

  // Ensure user registration in tracking collections
  if (!userSockets.has(user)) {
    userSockets.set(user, new Set());
  }
  if (!ALL_USERS.includes(user)) {
    ALL_USERS.push(user);
  }
  if (!USER_ROOMS[user]) {
    USER_ROOMS[user] = ['family'];
  }

  socketToUser.set(socket.id, user);
  userSockets.get(user).add(socket.id);

  console.log(`[Server] User connected: ${user} (Socket: ${socket.id}, Devices: ${userSockets.get(user).size})`);

  // Join user to their authorized rooms
  const allowedRooms = USER_ROOMS[user] || ['family'];
  allowedRooms.forEach((roomId) => {
    socket.join(roomId);
  });

  // Broadcast updated presence statuses to all clients
  io.emit('status_update', getOnlineStatus());

  // Send message history
  const userHistory = messageHistory.filter((msg) => allowedRooms.includes(msg.roomId));
  socket.emit('history', userHistory);

  // Handle incoming messages
  socket.on('send_message', (data) => {
    if (data.sender !== user) {
      console.warn(`[Server] Spoofing check failed: ${user} tried to send as ${data.sender}`);
      return;
    }

    if (!allowedRooms.includes(data.roomId)) {
      console.warn(`[Server] Unauthorized room send check failed: ${user} in ${data.roomId}`);
      return;
    }

    let finalFile = data.file;
    if (finalFile && finalFile.data && finalFile.data.startsWith('data:')) {
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
        console.error('[Server] Failed to process fallback base64 file:', err);
      }
    }

    const newMessage = {
      id: data.id || Math.random().toString(36).substring(2, 9),
      roomId: data.roomId,
      sender: user,
      text: data.text || '',
      timestamp: data.timestamp || Date.now(),
      replyToId: data.replyToId || undefined,
      file: finalFile || undefined,
      readBy: []
    };

    messageHistory.push(newMessage);
    if (messageHistory.length > 1000) {
      const removedMsg = messageHistory.shift();
      if (removedMsg && removedMsg.file && removedMsg.file.data) {
        deleteAttachedFile(removedMsg.file.data);
      }
    }

    persistMessages();
    io.to(data.roomId).emit('receive_message', newMessage);
  });

  // Handle editing a message
  socket.on('edit_message', ({ messageId, roomId, newText }) => {
    if (!allowedRooms.includes(roomId)) return;
    const msgIndex = messageHistory.findIndex((m) => m.id === messageId && m.roomId === roomId);
    if (msgIndex === -1 || messageHistory[msgIndex].sender !== user) return;

    messageHistory[msgIndex].text = newText;
    messageHistory[msgIndex].isEdited = true;
    persistMessages();

    io.to(roomId).emit('message_edited', { messageId, roomId, newText });
  });

  // Handle deleting a message
  socket.on('delete_message', ({ messageId, roomId }) => {
    if (!allowedRooms.includes(roomId)) return;
    const msgIndex = messageHistory.findIndex((m) => m.id === messageId && m.roomId === roomId);
    if (msgIndex === -1 || messageHistory[msgIndex].sender !== user) return;

    const [deletedMsg] = messageHistory.splice(msgIndex, 1);
    if (deletedMsg && deletedMsg.file && deletedMsg.file.data) {
      deleteAttachedFile(deletedMsg.file.data);
    }

    persistMessages();
    io.to(roomId).emit('message_deleted', { messageId, roomId });
  });

  // Handle emoji reactions
  socket.on('toggle_reaction', ({ messageId, roomId, reaction }) => {
    if (!allowedRooms.includes(roomId)) return;
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

    persistMessages();
    io.to(roomId).emit('reactions_updated', { messageId, roomId, reactions: msg.reactions });
  });

  // Handle read receipts
  socket.on('mark_read', ({ roomId, messageIds }) => {
    if (!allowedRooms.includes(roomId) || !Array.isArray(messageIds)) return;

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
      persistMessages();
      io.to(roomId).emit('messages_read', { roomId, updatedMessages });
    }
  });

  // Typing indicators
  socket.on('typing', ({ roomId, isTyping }) => {
    if (!allowedRooms.includes(roomId)) return;
    socket.to(roomId).emit('typing_update', {
      roomId,
      username: user,
      isTyping
    });
  });

  // WebRTC Calling Handlers
  socket.on('call_user', ({ roomId, receiver, type }) => {
    if (!allowedRooms.includes(roomId)) return;
    socket.to(roomId).emit('call_incoming', {
      roomId,
      caller: user,
      callerSocketId: socket.id,
      type
    });
  });

  socket.on('call_accept', ({ roomId, targetSocketId }) => {
    if (!allowedRooms.includes(roomId)) return;
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_accepted', { roomId, targetSocketId: socket.id });
    } else {
      socket.to(roomId).emit('call_accepted', { roomId, targetSocketId: socket.id });
    }
  });

  socket.on('call_reject', ({ roomId, targetSocketId }) => {
    if (!allowedRooms.includes(roomId)) return;
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_rejected', { roomId });
    } else {
      socket.to(roomId).emit('call_rejected', { roomId });
    }
  });

  socket.on('call_end', ({ roomId, targetSocketId }) => {
    if (!allowedRooms.includes(roomId)) return;
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_ended', { roomId });
    } else {
      socket.to(roomId).emit('call_ended', { roomId });
    }
  });

  socket.on('webrtc_signal', ({ roomId, targetSocketId, signal }) => {
    if (!allowedRooms.includes(roomId)) return;
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc_signal', { signal, senderSocketId: socket.id });
    } else {
      socket.to(roomId).emit('webrtc_signal', { signal, senderSocketId: socket.id });
    }
  });

  socket.on('get_status', () => {
    socket.emit('status_update', getOnlineStatus());
  });

  // Disconnect
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

const PORT = 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`  🚀 Secure Comms Server Active:`);
  console.log(`  - API & WebSockets: http://localhost:${PORT}`);
  console.log(`  - Local Network:    http://192.168.0.9:${PORT}`);
  console.log(`======================================================\n`);
});
