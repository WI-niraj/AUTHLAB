
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing');
}

const isRenderExternal =
    new URL(databaseUrl).hostname.endsWith(
        '.render.com'
    );

const sql = postgres(databaseUrl, {
    ssl: isRenderExternal ? 'require' : false,
    max: 1,
    connect_timeout: 15,
});

async function migrate() {
    try {
        console.log('Connecting to PostgreSQL...');

        const [connection] = await sql`
      SELECT
        current_database() AS database_name,
        current_user AS database_user
    `;

        if (!connection) {
            throw new Error('Database connection failed');
        }

        console.log(
            'Connected to database:',
            connection.database_name
        );

        await sql.begin(async (tx) => {
            // Fix existing users table
            await tx`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status VARCHAR(16)
  NOT NULL DEFAULT 'pending'
`;

            await tx`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mobile_verified_at TIMESTAMPTZ
`;

            console.log('Existing users table updated successfully');
            // 1. USERS
            await tx`
        CREATE TABLE IF NOT EXISTS users (
          id uuid PRIMARY KEY,
          display_name varchar(80) NOT NULL,
          mobile varchar(16) NOT NULL UNIQUE,
          password_hash text NOT NULL,
          status varchar(16) NOT NULL DEFAULT 'pending'
            CHECK (status IN (
              'pending', 'active', 'disabled'
            )),
          mobile_verified_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;

            // Repair previously created partial users table.
            await tx`
        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS
            status varchar(16)
            NOT NULL DEFAULT 'pending',
          ADD COLUMN IF NOT EXISTS
            mobile_verified_at timestamptz
      `;

            // Preserve verification state from the earlier
            // starter table, if that column exists.
            const [oldColumn] = await tx`
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'users'
          AND column_name = 'mobile_verified'
      `;

            if (oldColumn) {
                await tx`
          UPDATE users
          SET mobile_verified_at =
            COALESCE(
              mobile_verified_at,
              updated_at,
              now()
            )
          WHERE mobile_verified = TRUE
            AND mobile_verified_at IS NULL
        `;
            }

            // Add the status constraint if missing.
            await tx`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conrelid = 'users'::regclass
              AND conname = 'users_status_check'
          ) THEN
            ALTER TABLE users
            ADD CONSTRAINT users_status_check
            CHECK (
              status IN (
                'pending', 'active', 'disabled'
              )
            );
          END IF;
        END
        $$
      `;

            console.log('Users table ready');

            // 2. OTP CHALLENGES
            await tx`
        CREATE TABLE IF NOT EXISTS otp_challenges (
          id uuid PRIMARY KEY,
          user_id uuid REFERENCES users(id)
            ON DELETE CASCADE,
          target_mobile varchar(16) NOT NULL,
          purpose varchar(32) NOT NULL
            CHECK (purpose IN (
              'register',
              'reset_password',
              'change_mobile'
            )),
          code_hash varchar(64) NOT NULL,
          expires_at timestamptz NOT NULL,
          attempts integer NOT NULL DEFAULT 0,
          consumed_at timestamptz,
          created_at timestamptz
            NOT NULL DEFAULT now()
        )
      `;

            await tx`
        CREATE INDEX IF NOT EXISTS otp_lookup
        ON otp_challenges(
          target_mobile,
          purpose,
          created_at DESC
        )
      `;

            console.log('OTP challenges table ready');

            // 3. SESSIONS
            await tx`
        CREATE TABLE IF NOT EXISTS sessions (
          id uuid PRIMARY KEY,
          user_id uuid NOT NULL
            REFERENCES users(id) ON DELETE CASCADE,
          token_hash varchar(64) NOT NULL UNIQUE,
          created_at timestamptz
            NOT NULL DEFAULT now(),
          expires_at timestamptz NOT NULL,
          last_seen_at timestamptz
            NOT NULL DEFAULT now(),
          revoked_at timestamptz,
          user_agent varchar(300)
        )
      `;

            await tx`
        CREATE INDEX IF NOT EXISTS
          sessions_active_user
        ON sessions(user_id)
        WHERE revoked_at IS NULL
      `;

            console.log('Sessions table ready');

            // 4. RESET GRANTS
            await tx`
        CREATE TABLE IF NOT EXISTS reset_grants (
          id uuid PRIMARY KEY,
          user_id uuid NOT NULL
            REFERENCES users(id) ON DELETE CASCADE,
          token_hash varchar(64) NOT NULL UNIQUE,
          expires_at timestamptz NOT NULL,
          consumed_at timestamptz,
          created_at timestamptz
            NOT NULL DEFAULT now()
        )
      `;

            console.log('Reset grants table ready');

            // 5. RATE LIMITS
            await tx`
        CREATE TABLE IF NOT EXISTS rate_limits (
          scope varchar(32) NOT NULL,
          key_hash varchar(64) NOT NULL,
          window_start timestamptz NOT NULL,
          hits integer NOT NULL DEFAULT 0,
          PRIMARY KEY (scope, key_hash)
        )
      `;

            console.log('Rate limits table ready');

            // 6. AUDIT EVENTS
            await tx`
        CREATE TABLE IF NOT EXISTS audit_events (
          id bigserial PRIMARY KEY,
          user_id uuid REFERENCES users(id)
            ON DELETE SET NULL,
          event varchar(80) NOT NULL,
          occurred_at timestamptz
            NOT NULL DEFAULT now()
        )
      `;

            await tx`
        CREATE INDEX IF NOT EXISTS audit_recent
        ON audit_events(
          user_id,
          occurred_at DESC
        )
      `;

            console.log('Audit events table ready');
        });

        console.log(
            'All database migrations completed successfully!'
        );

    } catch (error) {
        console.error('Migration failed:', error);
        process.exitCode = 1;
    } finally {
        await sql.end();
    }
}

await migrate();
