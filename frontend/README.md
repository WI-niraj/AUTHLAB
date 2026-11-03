# AuthLab frontend

A clean, responsive React + TypeScript frontend for your existing Fastify + PostgreSQL authentication backend. Includes sign up, OTP verification/resend, login/logout, profile dashboard, password recovery, change password, change mobile, active session list and revocation.

## Run locally (Windows / PowerShell)

1. Start your PostgreSQL Docker container and your Fastify backend first, at **http://127.0.0.1:4000**.
2. Ensure your backend `server/.env` contains:

   ```dotenv
   PORT=4000
   HOST=127.0.0.1
   APP_ORIGIN=http://localhost:3000
   DATABASE_URL=postgresql://authlab:authlab@127.0.0.1:5444/authlab
   ```

   Keep any other variables your backend depends on. Do not commit `.env`.
3. Extract this ZIP into a **new** directory, e.g. `AuthModuleTask/frontend`, separate from `server`.
4. Run:

   ```powershell
   cd C:\Users\asus\WorkInfinity\AuthModuleTask\frontend
   npm install
   npm run dev
   ```
5. Open **http://localhost:3000** (use `localhost`, not `127.0.0.1`, for the frontend).

## Why use the Vite proxy?

- `vite.config.ts` forwards browser calls `/api/*` and `/health` to `http://127.0.0.1:4000`.
- From the browser's perspective requests use `http://localhost:3000`, making cookies same-origin during development.
- HttpOnly session cookies are managed by the browser; no tokens are stored in JS or localStorage.
- The backend's `APP_ORIGIN` should match `http://localhost:3000` exactly.
- If your backend isn't running, frontend API requests will fail even though the UI loads.

For production, configure your real deployment origin and a secure HTTPS reverse proxy to expose the API from the same site. Review SameSite/Secure settings and CSRF defense before going live. The dev proxy only runs with Vite's development server, **not** on standalone `dist/` deployments.

## Screens and backend endpoints

| Screen | Endpoint |
|---|---|
| Registration | POST `/api/auth/register` |
| Verify mobile | POST `/api/auth/verify-mobile` |
| Resend OTP | POST `/api/auth/resend-otp` |
| Login | POST `/api/auth/login` |
| Dashboard/profile | GET `/api/auth/me` |
| Logout | POST `/api/auth/logout` |
| Forgot password | POST `/api/auth/forgot-password` |
| Verify reset OTP | POST `/api/auth/verify-reset-otp` |
| Reset password | POST `/api/auth/reset-password` |
| Change password | POST `/api/account/change-password` |
| Request mobile change | POST `/api/account/mobile-change/request` |
| Confirm mobile change | POST `/api/account/mobile-change/confirm` |
| Active sessions | GET `/api/account/sessions` |
| Revoke session | DELETE `/api/account/sessions/:id` |
| Health | GET `/health` |

The frontend deliberately uses the **exact endpoint paths** from your original `routes.ts`. Your refactored backend must still expose those same routes.

## OTP testing

In your development backend, the temporary OTP service prints `[DEV OTP] register: 123456` etc. Use the actual code from that log. For production, OTP delivery must be handled privately by an SMS provider, with appropriate OTP hashing and security controls.

## Important compatibility notes

- Original AuthLab mobile numbers are international format (`+919876543210`).
- Passwords must have 12–128 characters including letters and numbers.
- Authentication uses `authlab_session` HttpOnly cookie, not a Bearer token.
- Registration and forgot-password APIs intentionally return generic messages for privacy; a `202` doesn't guarantee an OTP was sent.
- Password and mobile changes revoke sessions; the UI navigates back to login.
- Never ship the backend's current development OTP logging, plain SHA-256 OTP storage, in-memory limiter, or permissive missing-Origin handling as a production security design.

## Production build

```powershell
npm run build
```

This validates TypeScript and outputs static files into `dist/`. You'll need production web server routing for React paths (SPA fallback) and an HTTPS reverse proxy for `/api`.

## File layout

```text
frontend/
  src/
    api.ts        # all backend API calls
    App.tsx       # pages, components, navigation
    main.tsx      # React entry
    styles.css    # full responsive design
  vite.config.ts  # localhost backend proxy
  index.html
  package.json
  tsconfig.json
```
