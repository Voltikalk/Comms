-- ============================================================================
-- 006_add_cloud_password.sql
-- Description: Two-step verification ("Облачный пароль"): bcrypt hash of the
--              cloud password and an optional plaintext hint (<= 64 chars).
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS cloud_password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cloud_password_hint VARCHAR(64);

COMMENT ON COLUMN users.cloud_password_hash IS 'bcrypt (12 rounds) hash of the 2FA cloud password; NULL = disabled';
COMMENT ON COLUMN users.cloud_password_hint IS 'Optional user-visible hint shown on the 2FA step of login';
