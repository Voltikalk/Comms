import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Trust proxy headers for reverse proxies (like Nginx)
app.set('trust proxy', 1);

// Increase JSON body limits for large base64 file payloads (legacy fallback)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Enable CORS for API routes
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

// File Upload endpoint supporting both FormData (binary) and JSON base64 fallback
app.post('/api/upload', (req, res) => {
  uploadMiddleware.single('file')(req, res, (err) => {
    if (err) {
      console.error('[Upload Middleware Error]', err);
      return res.status(400).json({ error: err.message || 'File upload error' });
    }

    // Binary file uploaded via FormData
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

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e8 // 100MB max packet size for base64 files
});

// Map secret keys to user IDs
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
    
    // Auto-migrate legacy base64 files to static server files to prevent client INP hangs
    let migratedCount = 0;
    messageHistory = messageHistory.map((msg) => {
      if (msg.file && msg.file.data && msg.file.data.startsWith('data:')) {
        try {
          const name = msg.file.name || 'migrated_file';
          const fileDataStr = msg.file.data;
          
          const base64Data = fileDataStr.replace(/^data:[^;]+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          
          const ext = path.extname(name) || (msg.file.type === 'audio' ? '.webm' : msg.file.type === 'video' ? '.mp4' : '.bin');
          const uniqueName = `migrated-${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
          const filePath = path.join(UPLOADS_DIR, uniqueName);
          
          fs.writeFileSync(filePath, buffer);
          
          migratedCount++;
          return {
            ...msg,
            file: {
              ...msg.file,
              data: `/uploads/${uniqueName}`
            }
          };
        } catch (migErr) {
          console.error('[Server] Failed to migrate base64 message file:', migErr);
        }
      }
      return msg;
    });

    if (migratedCount > 0) {
      console.log(`[Server] Successfully migrated ${migratedCount} legacy base64 files to static uploads.`);
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messageHistory, null, 2));
    }
  } else {
    console.log('[Server] No persistent message file found. Starting with empty history.');
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

io.on('connection', (socket) => {
  const key = socket.handshake.auth?.token || socket.handshake.query?.token;
  const user = AUTH_KEYS[key];

  if (!user) {
    console.log(`[Server] Unauthorized connection attempt: ${socket.id}`);
    socket.emit('auth_error', { message: 'Invalid access key' });
    socket.disconnect(true);
    return;
  }

  // Assign user mapping & multi-device tracking
  socketToUser.set(socket.id, user);
  if (!userSockets.has(user)) {
    userSockets.set(user, new Set());
  }
  userSockets.get(user).add(socket.id);

  console.log(`[Server] User connected: ${user} (Socket: ${socket.id}, Active devices: ${userSockets.get(user).size})`);

  // Join user to their authorized rooms
  const allowedRooms = USER_ROOMS[user] || [];
  allowedRooms.forEach((roomId) => {
    socket.join(roomId);
    console.log(`[Server] Socket ${socket.id} (${user}) joined room: ${roomId}`);
  });

  // Broadcast updated presence statuses to all clients
  io.emit('status_update', getOnlineStatus());

  // Send message history for the rooms this user is authorized to see
  const userHistory = messageHistory.filter((msg) => allowedRooms.includes(msg.roomId));
  socket.emit('history', userHistory);

  // Handle incoming messages
  socket.on('send_message', (data) => {
    // Security check: Verify sender authenticity and room authorization
    if (data.sender !== user) {
      console.warn(`[Server] Sender spoofing check failed: Socket ${user} tried to send as ${data.sender}`);
      return;
    }

    if (!allowedRooms.includes(data.roomId)) {
      console.warn(`[Server] Unauthorized room send check failed: User ${user} tried to send to unauthorized room ${data.roomId}`);
      return;
    }

    let finalFile = data.file;
    
    // If the file is still a Base64 string (fallback from client), save it to disk
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
        const ext = path.extname(finalFile.name || '') || (finalFile.type === 'audio' ? '.webm' : (finalFile.type === 'video' || finalFile.type === 'video_note') ? '.webm' : '.bin');
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

    // Persist messages to file safely
    persistMessages();

    // Relay message ONLY to participants of this specific room
    io.to(data.roomId).emit('receive_message', newMessage);
    console.log(`[Server] Message from ${user} in "${data.roomId}": "${data.text}"`);
  });

  // Handle editing a message
  socket.on('edit_message', ({ messageId, roomId, newText }) => {
    // Security check: Verify sender is authorized for this room
    if (!allowedRooms.includes(roomId)) return;

    const msgIndex = messageHistory.findIndex((m) => m.id === messageId && m.roomId === roomId);
    if (msgIndex === -1) return;

    // Security check: Verify editing is done by the sender
    if (messageHistory[msgIndex].sender !== user) return;

    messageHistory[msgIndex].text = newText;
    messageHistory[msgIndex].isEdited = true;

    persistMessages();

    // Broadcast update to room
    io.to(roomId).emit('message_edited', { messageId, roomId, newText });
  });

  // Handle deleting a message
  socket.on('delete_message', ({ messageId, roomId }) => {
    // Security check: Verify sender is authorized for this room
    if (!allowedRooms.includes(roomId)) return;

    const msgIndex = messageHistory.findIndex((m) => m.id === messageId && m.roomId === roomId);
    if (msgIndex === -1) return;

    // Security check: Verify deleting is done by the sender
    if (messageHistory[msgIndex].sender !== user) return;

    const [deletedMsg] = messageHistory.splice(msgIndex, 1);
    if (deletedMsg && deletedMsg.file && deletedMsg.file.data) {
      deleteAttachedFile(deletedMsg.file.data);
    }

    persistMessages();

    // Broadcast delete event
    io.to(roomId).emit('message_deleted', { messageId, roomId });
  });

  // Handle emoji reactions
  socket.on('toggle_reaction', ({ messageId, roomId, reaction }) => {
    // Security check: Verify sender is authorized for this room
    if (!allowedRooms.includes(roomId)) return;

    const msgIndex = messageHistory.findIndex((m) => m.id === messageId && m.roomId === roomId);
    if (msgIndex === -1) return;

    const msg = messageHistory[msgIndex];
    if (!msg.reactions) {
      msg.reactions = {};
    }

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

    // Broadcast reaction update
    io.to(roomId).emit('reactions_updated', { messageId, roomId, reactions: msg.reactions });
  });

  // Handle read receipts — mark messages as read by this user
  socket.on('mark_read', ({ roomId, messageIds }) => {
    if (!allowedRooms.includes(roomId)) return;
    if (!Array.isArray(messageIds)) return;

    const updatedMessages = [];
    messageIds.forEach((messageId) => {
      const msgIndex = messageHistory.findIndex((m) => m.id === messageId && m.roomId === roomId);
      if (msgIndex === -1) return;

      const msg = messageHistory[msgIndex];
      if (msg.sender === user) return; // Can't mark own message

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

  // Handle typing indicators
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
    
    // Broadcast incoming call to other users in this direct room with caller's socketId
    socket.to(roomId).emit('call_incoming', {
      roomId,
      caller: user,
      callerSocketId: socket.id,
      type
    });
    console.log(`[Server] ${user} is calling ${receiver} in room ${roomId} (${type}, socket: ${socket.id})`);
  });

  socket.on('call_accept', ({ roomId, targetSocketId }) => {
    if (!allowedRooms.includes(roomId)) return;
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_accepted', { roomId, targetSocketId: socket.id });
    } else {
      socket.to(roomId).emit('call_accepted', { roomId, targetSocketId: socket.id });
    }
    console.log(`[Server] Call accepted in room ${roomId} (callee socket: ${socket.id})`);
  });

  socket.on('call_reject', ({ roomId, targetSocketId }) => {
    if (!allowedRooms.includes(roomId)) return;
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_rejected', { roomId });
    } else {
      socket.to(roomId).emit('call_rejected', { roomId });
    }
    console.log(`[Server] Call rejected in room ${roomId}`);
  });

  socket.on('call_end', ({ roomId, targetSocketId }) => {
    if (!allowedRooms.includes(roomId)) return;
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_ended', { roomId });
    } else {
      socket.to(roomId).emit('call_ended', { roomId });
    }
    console.log(`[Server] Call ended in room ${roomId}`);
  });

  socket.on('webrtc_signal', ({ roomId, targetSocketId, signal }) => {
    if (!allowedRooms.includes(roomId)) return;
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc_signal', { signal, senderSocketId: socket.id });
    } else {
      socket.to(roomId).emit('webrtc_signal', { signal, senderSocketId: socket.id });
    }
  });

  // Handle manual status check
  socket.on('get_status', () => {
    socket.emit('status_update', getOnlineStatus());
  });

  // Handle disconnects
  socket.on('disconnect', () => {
    const disconnectedUser = socketToUser.get(socket.id);
    if (disconnectedUser) {
      socketToUser.delete(socket.id);
      const userSocketsSet = userSockets.get(disconnectedUser);
      if (userSocketsSet) {
        userSocketsSet.delete(socket.id);
      }
      console.log(`[Server] User disconnected: ${disconnectedUser} (Socket: ${socket.id}, Remaining devices: ${userSocketsSet?.size || 0})`);
      io.emit('status_update', getOnlineStatus());
    }
  });
});

const PORT = 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`  Chat Socket.io server running:`);
  console.log(`  - Local:   http://localhost:${PORT}`);
  console.log(`  - Network: http://192.168.0.9:${PORT}`);
  console.log(`======================================================\n`);
});
