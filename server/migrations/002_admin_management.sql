
BEGIN;

-- USERS
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role varchar(20)
    NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS disabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS disabled_reason text,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'users'::regclass
      AND conname = 'users_role_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('user', 'admin', 'super_admin'));
  END IF;
END $$;

-- SESSIONS
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS ip_address inet,
  ADD COLUMN IF NOT EXISTS country_code varchar(2),
  ADD COLUMN IF NOT EXISTS country_name varchar(100),
  ADD COLUMN IF NOT EXISTS region varchar(100),
  ADD COLUMN IF NOT EXISTS city varchar(100),
  ADD COLUMN IF NOT EXISTS browser_name varchar(60),
  ADD COLUMN IF NOT EXISTS os_name varchar(60),
  ADD COLUMN IF NOT EXISTS device_type varchar(30),
  ADD COLUMN IF NOT EXISTS last_ip_address inet;

-- AUDIT EVENTS
ALTER TABLE audit_events
  ADD COLUMN IF NOT EXISTS actor_user_id uuid
    REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_user_id uuid
    REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS session_id uuid,
  ADD COLUMN IF NOT EXISTS ip_address inet,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- ADMIN QUERY INDEXES
CREATE INDEX IF NOT EXISTS users_role_status_idx
  ON users(role, status);

CREATE INDEX IF NOT EXISTS users_created_idx
  ON users(created_at DESC);

CREATE INDEX IF NOT EXISTS sessions_user_recent_idx
  ON sessions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS sessions_last_seen_idx
  ON sessions(last_seen_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS sessions_country_idx
  ON sessions(country_code)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS sessions_expiry_idx
  ON sessions(expires_at)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS otp_user_recent_idx
  ON otp_challenges(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS reset_grants_user_idx
  ON reset_grants(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS rate_limits_window_idx
  ON rate_limits(window_start);

CREATE INDEX IF NOT EXISTS audit_actor_recent_idx
  ON audit_events(actor_user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS audit_target_recent_idx
  ON audit_events(target_user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS audit_event_recent_idx
  ON audit_events(event, occurred_at DESC);

CREATE INDEX IF NOT EXISTS audit_occurred_idx
  ON audit_events(occurred_at DESC);

COMMIT;
