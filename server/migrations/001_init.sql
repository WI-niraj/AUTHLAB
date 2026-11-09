
-- ============================================================
-- AUTHLAB DATABASE SCHEMA
-- Admin Management + Authentication + Session Monitoring
-- ============================================================

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  display_name varchar(80) NOT NULL,
  mobile varchar(16) NOT NULL UNIQUE,
  password_hash text NOT NULL,

  status varchar(16) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'disabled')),

  -- Admin role
  role varchar(20) NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin', 'super_admin')),

  mobile_verified_at timestamptz,

  -- Account controls
  disabled_at timestamptz,
  disabled_reason text,
  password_changed_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_role_status_idx
  ON users(role, status);

CREATE INDEX IF NOT EXISTS users_created_idx
  ON users(created_at DESC);


-- 2. OTP CHALLENGES
CREATE TABLE IF NOT EXISTS otp_challenges (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  target_mobile varchar(16) NOT NULL,

  purpose varchar(32) NOT NULL
    CHECK (purpose IN (
      'register',
      'reset_password',
      'change_mobile'
    )),

  code_hash varchar(64) NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0
    CHECK (attempts >= 0),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS otp_lookup
  ON otp_challenges(target_mobile, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS otp_user_recent_idx
  ON otp_challenges(user_id, created_at DESC);


-- 3. SESSIONS
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY,

  user_id uuid NOT NULL
    REFERENCES users(id) ON DELETE CASCADE,

  token_hash varchar(64) NOT NULL UNIQUE,

  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,

  -- Original browser information
  user_agent varchar(300),

  -- Login network information
  ip_address inet,

  -- Approximate geographical location at login
  country_code varchar(2),
  country_name varchar(100),
  region varchar(100),
  city varchar(100),

  -- Parsed browser and device information
  browser_name varchar(60),
  os_name varchar(60),
  device_type varchar(30),

  -- Last network observed during authenticated activity
  last_ip_address inet,

  CONSTRAINT sessions_expiry_check
    CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS sessions_active_user
  ON sessions(user_id)
  WHERE revoked_at IS NULL;

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


-- 4. RESET GRANTS
CREATE TABLE IF NOT EXISTS reset_grants (
  id uuid PRIMARY KEY,

  user_id uuid NOT NULL
    REFERENCES users(id) ON DELETE CASCADE,

  token_hash varchar(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reset_grants_user_idx
  ON reset_grants(user_id, created_at DESC);


-- 5. RATE LIMITS
CREATE TABLE IF NOT EXISTS rate_limits (
  scope varchar(32) NOT NULL,
  key_hash varchar(64) NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0
    CHECK (hits >= 0),

  PRIMARY KEY(scope, key_hash)
);

CREATE INDEX IF NOT EXISTS rate_limits_window_idx
  ON rate_limits(window_start);


-- 6. AUDIT EVENTS
CREATE TABLE IF NOT EXISTS audit_events (
  id bigserial PRIMARY KEY,

  -- Original user association
  user_id uuid REFERENCES users(id)
    ON DELETE SET NULL,

  event varchar(80) NOT NULL,

  -- Administrator or user who performed the action
  actor_user_id uuid REFERENCES users(id)
    ON DELETE SET NULL,

  -- Account affected by the action
  target_user_id uuid REFERENCES users(id)
    ON DELETE SET NULL,

  -- Related session (without a hard FK, to preserve logs)
  session_id uuid,

  -- Network information
  ip_address inet,

  -- Additional non-sensitive event context
  metadata jsonb,

  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_recent
  ON audit_events(user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS audit_actor_recent_idx
  ON audit_events(actor_user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS audit_target_recent_idx
  ON audit_events(target_user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS audit_event_recent_idx
  ON audit_events(event, occurred_at DESC);

CREATE INDEX IF NOT EXISTS audit_occurred_idx
  ON audit_events(occurred_at DESC);
