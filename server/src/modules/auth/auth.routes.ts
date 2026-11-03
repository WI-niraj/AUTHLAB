import type { FastifyInstance } from 'fastify';
import * as controller from './auth.controller.js';
import { loginSchema, mobileBodySchema, mobileCodeSchema, registerSchema } from '../common/schemas.js';
import type { LoginBody, MobileBody, MobileCodeBody, RegisterBody } from '../common/types.js';

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: RegisterBody }>('/api/auth/register', { schema: { body: registerSchema } }, controller.register);
  app.post<{ Body: MobileCodeBody }>('/api/auth/verify-mobile', { schema: { body: mobileCodeSchema } }, controller.verifyMobile);
  app.post<{ Body: MobileBody }>('/api/auth/resend-otp', { schema: { body: mobileBodySchema } }, controller.resendOtp);
  app.post<{ Body: LoginBody }>('/api/auth/login', { schema: { body: loginSchema } }, controller.login);
  app.get('/api/auth/me', controller.me);
  app.post('/api/auth/logout', controller.logout);
}
