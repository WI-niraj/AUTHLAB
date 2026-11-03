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
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

type ErrorPayload = {
  message?: string;
  error?: { message?: string; code?: string } | string;
};

// All URLs are relative to the Vite proxy (/api -> Fastify on port 4000).
// HttpOnly auth cookies stay browser-managed: never put session tokens in localStorage.
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  const text = await response.text();
  let body: ErrorPayload & T;
  try { body = text ? JSON.parse(text) : ({} as ErrorPayload & T); }
  catch { throw new ApiError(response.status, 'Unexpected response from server.'); }

  if (!response.ok) {
    const error = body?.error;
    const message = (typeof error === 'object' ? error?.message : error)
      || body?.message || `Request failed (${response.status})`;
    const code = typeof error === 'object' ? error?.code : undefined;
    throw new ApiError(response.status, message, code);
  }
  return body;
}

export const api = {
  health: () => request<{ status: string }>('/health'),
  register: (body: { displayName: string; mobile: string; password: string }) =>
    request<{ message: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  resendOtp: (mobile: string) =>
    request<{ message: string }>('/api/auth/resend-otp', { method: 'POST', body: JSON.stringify({ mobile }) }),
  verifyMobile: (mobile: string, code: string) =>
    request<{ message: string }>('/api/auth/verify-mobile', { method: 'POST', body: JSON.stringify({ mobile, code }) }),
  login: (mobile: string, password: string) =>
    request<{ message: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ mobile, password }) }),
  me: () => request<{ user: User }>('/api/auth/me'),
  logout: () => request<{ message: string }>('/api/auth/logout', { method: 'POST' }),
  forgotPassword: (mobile: string) =>
    request<{ message: string }>('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ mobile }) }),
  verifyResetOtp: (mobile: string, code: string) =>
    request<{ resetToken: string; expiresIn: number }>('/api/auth/verify-reset-otp', { method: 'POST', body: JSON.stringify({ mobile, code }) }),
  resetPassword: (resetToken: string, newPassword: string) =>
    request<{ message: string }>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ resetToken, newPassword }) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/api/account/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  requestMobileChange: (currentPassword: string, newMobile: string) =>
    request<{ message: string }>('/api/account/mobile-change/request', { method: 'POST', body: JSON.stringify({ currentPassword, newMobile }) }),
  confirmMobileChange: (newMobile: string, code: string) =>
    request<{ message: string }>('/api/account/mobile-change/confirm', { method: 'POST', body: JSON.stringify({ newMobile, code }) }),
  sessions: () => request<{ sessions: Session[] }>('/api/account/sessions'),
  revokeSession: (id: string) =>
    request<{ message: string }>(`/api/account/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
