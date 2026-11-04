
import { encryptSensitive } from './crypto';

export type User = {
  id: string;
  displayName: string;
  mobile: string;
  mobileVerified: boolean;
};

export type Session = {
  id: string;
  created_at: string;
  last_seen_at: string | null;
  expires_at: string;
  user_agent: string | null;
  current: boolean;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ErrorPayload = {
  message?: string;
  error?: {
    message?: string;
    code?: string;
  } | string;
};

// Backend API URL from Render environment variables.
// Falls back to relative URLs for local Vite proxy development.
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || ''
).replace(/\/+$/, '');

export async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers,
    },
  });

  const text = await response.text();

  let body: ErrorPayload & T;

  try {
    body = text
      ? JSON.parse(text)
      : ({} as ErrorPayload & T);
  } catch {
    throw new ApiError(
      response.status,
      'Unexpected response from server.'
    );
  }

  if (!response.ok) {
    const error = body?.error;

    const message =
      (typeof error === 'object'
        ? error?.message
        : error) ||
      body?.message ||
      `Request failed (${response.status})`;

    const code =
      typeof error === 'object'
        ? error?.code
        : undefined;

    throw new ApiError(response.status, message, code);
  }

  return body;
}

export const api = {
  health: () =>
    request<{ status: string }>('/health'),

  // REGISTER - Encrypt password
  register: async (body: {
    displayName: string;
    mobile: string;
    password: string;
  }) =>
    request<{ message: string }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({
          displayName: body.displayName,
          mobile: body.mobile,
          password: await encryptSensitive(body.password),
        }),
      }
    ),

  // RESEND OTP - No sensitive code submitted
  resendOtp: (mobile: string) =>
    request<{ message: string }>(
      '/api/auth/resend-otp',
      {
        method: 'POST',
        body: JSON.stringify({ mobile }),
      }
    ),

  // VERIFY MOBILE - Encrypt OTP
  verifyMobile: async (mobile: string, code: string) =>
    request<{ message: string }>(
      '/api/auth/verify-mobile',
      {
        method: 'POST',
        body: JSON.stringify({
          mobile,
          code: await encryptSensitive(code),
        }),
      }
    ),

  // LOGIN - Encrypt password
  login: async (mobile: string, password: string) =>
    request<{ message: string }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({
          mobile,
          password: await encryptSensitive(password),
        }),
      }
    ),

  me: () =>
    request<{ user: User }>('/api/auth/me'),

  logout: () =>
    request<{ message: string }>(
      '/api/auth/logout',
      { method: 'POST' }
    ),

  // FORGOT PASSWORD - Only mobile number
  forgotPassword: (mobile: string) =>
    request<{ message: string }>(
      '/api/auth/forgot-password',
      {
        method: 'POST',
        body: JSON.stringify({ mobile }),
      }
    ),

  // VERIFY RESET OTP - Encrypt OTP
  verifyResetOtp: async (
    mobile: string,
    code: string
  ) =>
    request<{
      resetToken: string;
      expiresIn: number;
    }>(
      '/api/auth/verify-reset-otp',
      {
        method: 'POST',
        body: JSON.stringify({
          mobile,
          code: await encryptSensitive(code),
        }),
      }
    ),

  // RESET PASSWORD - Encrypt new password
  resetPassword: async (
    resetToken: string,
    newPassword: string
  ) =>
    request<{ message: string }>(
      '/api/auth/reset-password',
      {
        method: 'POST',
        body: JSON.stringify({
          resetToken,
          newPassword: await encryptSensitive(newPassword),
        }),
      }
    ),

  // CHANGE PASSWORD - Encrypt both passwords
  changePassword: async (
    currentPassword: string,
    newPassword: string
  ) =>
    request<{ message: string }>(
      '/api/account/change-password',
      {
        method: 'POST',
        body: JSON.stringify({
          currentPassword:
            await encryptSensitive(currentPassword),
          newPassword:
            await encryptSensitive(newPassword),
        }),
      }
    ),

  // MOBILE CHANGE - Encrypt current password
  requestMobileChange: async (
    currentPassword: string,
    newMobile: string
  ) =>
    request<{ message: string }>(
      '/api/account/mobile-change/request',
      {
        method: 'POST',
        body: JSON.stringify({
          currentPassword:
            await encryptSensitive(currentPassword),
          newMobile,
        }),
      }
    ),

  // CONFIRM MOBILE CHANGE - Encrypt OTP
  confirmMobileChange: async (
    newMobile: string,
    code: string
  ) =>
    request<{ message: string }>(
      '/api/account/mobile-change/confirm',
      {
        method: 'POST',
        body: JSON.stringify({
          newMobile,
          code: await encryptSensitive(code),
        }),
      }
    ),

  sessions: () =>
    request<{ sessions: Session[] }>(
      '/api/account/sessions'
    ),

  revokeSession: (id: string) =>
    request<{ message: string }>(
      `/api/account/sessions/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    ),
};
