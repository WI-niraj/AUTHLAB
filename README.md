# AuthLab — Authentication Module

AuthLab is a reusable authentication system built with **Fastify, TypeScript, PostgreSQL, Docker, and React**. It is designed to provide centralized authentication for multiple applications.

### Tech Stack

| Backend | Frontend | Database |
|---|---|---|
| Node.js, Fastify, TypeScript | React, TypeScript, Vite | PostgreSQL 17, Docker |

## Project Structure

```text
AuthModuleTask/
├── server/       # Backend API
├── frontend/     # React frontend
└── README.md
```

## Prerequisites

Install the following before starting:

- Node.js 22 or later
- Docker Desktop
- Git

## 1. Backend Setup

Open the backend folder:

```bash
cd server
npm install
```

Create your environment file:

**Windows PowerShell:**
```powershell
Copy-Item .env.example .env
```

Update `server/.env`:

```dotenv
NODE_ENV=development
PORT=4000
HOST=127.0.0.1
APP_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://authlab:authlab@127.0.0.1:5444/authlab
```

Keep any additional security variables from `.env.example`, including `OTP_PEPPER`. Generate a unique value if required:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Start PostgreSQL using Docker:

```bash
docker compose up -d
```

Check that PostgreSQL is running:

```bash
docker compose ps
```

Run the database migration on a fresh database:

```bash
npm run migrate
```

Start the backend:

```bash
npm run dev
```

Backend URL: **http://127.0.0.1:4000**

Health check: `GET /health`

> Ensure your Docker Compose port mapping is `127.0.0.1:5444:5432`. Do not rerun initialization SQL against an existing database without checking its migration behavior.

## 2. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: **http://localhost:3000**

The frontend connects to the backend through the Vite development proxy. Make sure the backend is running before testing authentication.

## Features

- User registration with mobile OTP verification
- Login and logout using secure session cookies
- Forgot and reset password
- Change password and mobile number
- View and revoke active sessions
- PostgreSQL-backed user and session management

## Main API Endpoints

| Method | Endpoint |
|---|---|
| POST | `/api/auth/register` |
| POST | `/api/auth/verify-mobile` |
| POST | `/api/auth/login` |
| GET | `/api/auth/me` |
| POST | `/api/auth/logout` |
| POST | `/api/auth/forgot-password` |
| POST | `/api/auth/verify-reset-otp` |
| POST | `/api/auth/reset-password` |
| GET | `/api/account/sessions` |

Other endpoints include resend OTP, change password, change mobile number, and session revocation.

## Testing

Use Postman to test the API at:

```text
http://127.0.0.1:4000
```

In development mode, generated OTPs appear in the backend terminal. Browser authentication uses HttpOnly cookies.

## Notes

- Never commit `.env`, passwords, or security keys.
- Keep Docker Desktop running while developing.
- Run `npm run build` in the frontend to check the production build.
- Before production deployment, configure HTTPS, real SMS delivery, secure OTP handling, persistent rate limiting, and CSRF protection.

---

**AuthLab — One authentication module, reusable across multiple applications.**