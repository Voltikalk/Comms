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
        
        const { data: uploadData, error: sbErr } = await supabase.storage
          .from('message-attachments')
          .upload(uniquePath, fileBuffer, {
            contentType: req.file.mimetype,
            upsert: true,
          });

        if (!sbErr && uploadData) {
          const { data: urlData } = supabase.storage
            .from('message-attachments')
            .getPublicUrl(uploadData.path);
          return res.json({ url: urlData.publicUrl });
        }
      } catch (uploadErr) {
        console.warn('[Supabase Storage Warning] Falling back to local upload URL:', uploadErr);
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
const memoryAttempts = [];

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

    const cleanInput = email.toLowerCase().trim();
    const user = memoryUsers.get(cleanInput);

    if (!user) {
      return res.status(401).json({ error: 'Неверный email/логин или пароль.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
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
    const { email, username, password, firstName, lastName } = req.body || {};
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

    const newUser = {
      userId,
      email: cleanEmail,
      username: cleanUsername,
      passwordHash,
      salt,
      isActive: true,
      firstName: firstName || cleanUsername,
      lastName: lastName || '',
      bio: '',
      statusEmoji: '✨',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    memoryUsers.set(userId, newUser);
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

const USER_ROOMS = {
  vlad: ['family', 'girlfriend', 'mom-dm', 'dad-dm', 'sister-dm'],
  anya: ['girlfriend'],
  mom: ['family', 'mom-dm', 'mom-dad-dm', 'mom-sister-dm'],
  dad: ['family', 'dad-dm', 'mom-dad-dm', 'dad-sister-dm'],
  sister: ['family', 'sister-dm', 'mom-sister-dm', 'dad-sister-dm']
};

const ALL_USERS = ['vlad', 'anya', 'mom', 'dad', 'sister'];
const userSockets = new Map();
ALL_USERS.forEach((u) => userSockets.set(u, new Set()));
const socketToUser = new Map();

function getOnlineStatus() {
  const status = {};
  for (const u of ALL_USERS) {
    status[u] = (userSockets.get(u)?.size || 0) > 0;
  }
  return status;
}

// In-Memory message cache synchronized with Supabase
let messageHistory = [];

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
        if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|heic)$/i.test(fName)) {
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
  if (!ALL_USERS.includes(user)) {
    ALL_USERS.push(user);
  }
  if (!USER_ROOMS[user]) {
    USER_ROOMS[user] = ['family'];
  }

  socketToUser.set(socket.id, user);
  userSockets.get(user).add(socket.id);

  console.log(`[Server] User connected: ${user} (Socket: ${socket.id}, Devices: ${userSockets.get(user).size})`);

  // Join authorized rooms
  const allowedRooms = USER_ROOMS[user] || ['family'];
  allowedRooms.forEach((roomId) => {
    socket.join(roomId);
  });

  // Broadcast presence
  io.emit('status_update', getOnlineStatus());

  // Send message history
  const userHistory = messageHistory.filter((msg) => allowedRooms.includes(msg.roomId));
  socket.emit('history', userHistory);

  // 1. SEND MESSAGE (Synchronized with Supabase)
  socket.on('send_message', async (data) => {
    if (data.sender !== user) return;
    if (!allowedRooms.includes(data.roomId)) return;

    let finalFile = data.file;

    // Process file upload if needed
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
        console.error('[Server] Failed to process base64 file:', err);
      }
    }

    const messageId = data.id || Math.random().toString(36).substring(2, 9);
    const newMessage = {
      id: messageId,
      roomId: data.roomId,
      sender: user,
      text: data.text || '',
      timestamp: data.timestamp || Date.now(),
      replyToId: data.replyToId || undefined,
      forwardedFrom: data.forwardedFrom || undefined,
      file: finalFile || undefined,
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
          const { data: insertedMsg, error: insErr } = await supabase
            .from('messages')
            .insert({
              room_id: roomUuid,
              sender_id: senderUuid,
              content: data.text || '',
            })
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
    if (!allowedRooms.includes(roomId)) return;
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

  // 3. DELETE MESSAGE (Synchronized with Supabase)
  socket.on('delete_message', async ({ messageId, roomId }) => {
    if (!allowedRooms.includes(roomId)) return;
    const msgIndex = messageHistory.findIndex((m) => m.id === messageId && m.roomId === roomId);
    if (msgIndex === -1 || messageHistory[msgIndex].sender !== user) return;

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

  // 5. MARK AS READ (Synchronized with Supabase)
  socket.on('mark_read', async ({ roomId, messageIds }) => {
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
    if (!allowedRooms.includes(roomId)) return;
    socket.to(roomId).emit('typing_update', {
      roomId,
      username: user,
      isTyping
    });
  });

  // 7. WEBRTC CALLING HANDLERS
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

const PORT = 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`  🚀 Secure Comms Server Active (Supabase Synced):`);
  console.log(`  - API & WebSockets: http://localhost:${PORT}`);
  console.log(`  - Local Network:    http://192.168.0.9:${PORT}`);
  console.log(`======================================================\n`);
});
