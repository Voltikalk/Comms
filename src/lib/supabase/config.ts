/**
 * Supabase Infrastructure & Client Configuration
 * Manages endpoints, timeouts, retries, rate limits, and storage buckets
 */

export const SUPABASE_CONFIG = {
  // URLs & Keys with safe defaults for development
  url: (import.meta as any).env?.VITE_SUPABASE_URL || 'https://comms-messenger.supabase.co',
  anonKey: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.comms-anon-key',
  
  // Network Timeouts (ms)
  timeouts: {
    connection: 10000,
    query: 15000,
    upload: 60000,
    realtimeHeartbeat: 25000,
  },

  // Resilient Retry Strategy
  retry: {
    maxRetries: 3,
    initialDelayMs: 500,
    maxDelayMs: 4000,
    backoffMultiplier: 1.8,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },

  // Client Rate Limiting
  rateLimits: {
    messagesPerSecond: 5,
    reactionsPerSecond: 10,
    typingEventsPerSecond: 2,
    searchDebounceMs: 300,
  },

  // Storage Buckets Configuration
  storage: {
    buckets: {
      avatars: 'avatars',
      attachments: 'message-attachments',
      media: 'chat-media',
      voiceNotes: 'voice-notes',
      videoNotes: 'video-notes',
    },
    maxFileSizeBytes: 50 * 1024 * 1024, // 50MB
    allowedImageMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedAudioMimes: ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/mpeg'],
    allowedVideoMimes: ['video/webm', 'video/mp4', 'video/quicktime'],
  },

  // Cache Configuration (TTL in milliseconds)
  cache: {
    userProfileTTL: 10 * 60 * 1000, // 10 minutes
    roomListTTL: 5 * 60 * 1000,     // 5 minutes
    messagesTTL: 2 * 60 * 1000,     // 2 minutes
    maxCachedEntries: 250,
  },

  // Logging & Performance Monitoring
  monitoring: {
    enableQueryLogs: (import.meta as any).env?.DEV ?? true,
    slowQueryThresholdMs: 800,
    enableErrorAlerts: true,
  },
};

export default SUPABASE_CONFIG;
