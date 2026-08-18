-- ============================================================================
-- 001_initial_schema.sql
-- Description: Initial Comms Database Schema with 9 core tables, indexes, and constraints
-- ============================================================================

-- 1. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Schema version tracking table
CREATE TABLE IF NOT EXISTS schema_version (
    id SERIAL PRIMARY KEY,
    version VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    batch INTEGER NOT NULL DEFAULT 1
);
COMMENT ON TABLE schema_version IS 'Таблица версионирования и истории примененных миграций БД.';

-- ----------------------------------------------------------------------------
-- 1. USERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(150),
    avatar_url VARCHAR(500),
    bio TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);
COMMENT ON TABLE users IS 'Пользователи мессенджера Comms.';
COMMENT ON COLUMN users.id IS 'Уникальный идентификатор пользователя (UUID).';
COMMENT ON COLUMN users.email IS 'Уникальный email пользователя.';
COMMENT ON COLUMN users.username IS 'Уникальный никнейм (@username).';
COMMENT ON COLUMN users.display_name IS 'Отображаемое имя в чатах.';

-- ----------------------------------------------------------------------------
-- 2. SESSIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_type VARCHAR(50) DEFAULT 'Bearer' NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(45)
);
COMMENT ON TABLE sessions IS 'Активные пользовательские сессии и токены.';

-- ----------------------------------------------------------------------------
-- 3. ROOMS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('direct', 'group')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    description TEXT,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE rooms IS 'Комнаты чатов (прямые диалоги и групповые каналы).';

-- ----------------------------------------------------------------------------
-- 4. ROOM_MEMBERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS room_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' NOT NULL CHECK (role IN ('admin', 'moderator', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    left_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_room_user_membership UNIQUE (room_id, user_id)
);
COMMENT ON TABLE room_members IS 'Участники комнат и их роли.';

-- ----------------------------------------------------------------------------
-- 5. MESSAGES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    edited_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL
);
COMMENT ON TABLE messages IS 'Сообщения чата.';

-- ----------------------------------------------------------------------------
-- 6. MESSAGE_ATTACHMENTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_url VARCHAR(1000) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE message_attachments IS 'Вложения сообщений (фото, аудио, видео, документы).';

-- ----------------------------------------------------------------------------
-- 7. MESSAGE_REACTIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_message_user_emoji UNIQUE (message_id, user_id, emoji)
);
COMMENT ON TABLE message_reactions IS 'Эмодзи-реакции на сообщения.';

-- ----------------------------------------------------------------------------
-- 8. MESSAGE_READ_RECEIPTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS message_read_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_message_user_receipt UNIQUE (message_id, user_id)
);
COMMENT ON TABLE message_read_receipts IS 'Отметки о прочтении сообщений (двойные галочки).';

-- ----------------------------------------------------------------------------
-- 9. LOGIN_ATTEMPTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    success BOOLEAN NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE login_attempts IS 'Аудит и логи попыток входа в систему.';

-- ----------------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_created ON messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message_id ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts(email, attempted_at DESC);
