# AUTH//LAB backend

Lightweight, extendable authentication API built with Fastify, TypeScript, PostgreSQL, Argon2id and built-in Node crypto. No managed auth/SMS provider needed for local development.

## Prerequisites
- Node.js 22+
- Docker with Compose (or PostgreSQL 17)

## Run
```bash
cp .env.example .env
# Replace OTP_PEPPER with a fresh 32-byte hex secret (do not commit it).
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
docker compose up -d
npm install
npm run migrate
npm run dev
```

For Windows PowerShell use `Copy-Item .env.example .env`. The `dev` and `migrate` npm scripts automatically load `.env` through Node 22. Equivalent direct commands:

```bash
# Easiest: npm scripts with Node's environment loading
node --env-file=.env --import tsx src/db/migrate.ts
node --env-file=.env --import tsx src/server.ts
```

The normal `npm run migrate` and `npm run dev` commands work after `.env` is created.

The API binds only to 127.0.0.1 for local development. Public deployment requires a trusted HTTPS reverse proxy and suitable host binding, with security settings reviewed first.

## API endpoints
| Method | Path | Body |
|---|---|---|
| POST | /api/auth/register | `{ "displayName":"Alex", "mobile":"+919999999999", "password":"ExamplePassword123" }` |
| POST | /api/auth/verify-mobile | `{ "mobile":"+919999999999", "code":"123456" }` |
| POST | /api/auth/resend-otp | `{ "mobile":"+919999999999" }` |
| POST | /api/auth/login | `{ "mobile":"+919999999999", "password":"ExamplePassword123" }` |
| GET | /api/auth/me | Session cookie |
| POST | /api/auth/logout | Session cookie |
| POST | /api/auth/forgot-password | `{ "mobile":"+919999999999" }` |
| POST | /api/auth/verify-reset-otp | `{ "mobile":"+919999999999", "code":"123456" }` |
| POST | /api/auth/reset-password | `{ "resetToken":"...", "newPassword":"NewPassword123" }` |
| POST | /api/account/change-password | `{ "currentPassword":"...", "newPassword":"..." }` |
| POST | /api/account/mobile-change/request | `{ "currentPassword":"...", "newMobile":"+918888888888" }` |
| POST | /api/account/mobile-change/confirm | `{ "newMobile":"+918888888888", "code":"123456" }` |
| GET | /api/account/sessions | Session cookie |
| DELETE | /api/account/sessions/:id | Session cookie |

All state-changing requests require `Origin: http://localhost:5173` by default (customize `PUBLIC_ORIGIN`). Browser requests must include `credentials:'include'`. Example:

```bash
curl -i http://localhost:4000/api/auth/register -H 'Origin: http://localhost:5173' -H 'Content-Type: application/json' -d '{"displayName":"Alex","mobile":"+919999999999","password":"ExamplePassword123"}'
```

In nonproduction mode, the demo OTP appears **only in your API terminal**. Never make terminal logs publicly accessible. Production refuses to deliver simulated OTPs; integrate a real, secure delivery provider before deployment.

## Design and extensions
- `src/modules/routes.ts`: HTTP endpoints; split into submodules as project grows.
- `src/modules/otp.ts`: OTP challenge lifecycle and atomic consumption.
- `src/modules/session.ts`: opaque random session token and server-side revocation.
- `src/providers/otp.ts`: replaceable OTP sender. Swap for an authenticated SMS relay later.
- `src/lib/`: security utilities, origin checks, rate limiter and config.
- `migrations/`: SQL schema (later add versioned migrations).

Suggested future entities: `user_identities` (OIDC/passkeys), `auth_factors`, `roles`, `permissions`, and `user_roles`. Keep the `users.id` immutable for all providers.