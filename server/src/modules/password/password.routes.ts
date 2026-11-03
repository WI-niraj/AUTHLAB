import type { FastifyInstance } from 'fastify';
import * as controller from './password.controller.js';
import { mobileBodySchema, mobileCodeSchema, resetPasswordSchema } from '../common/schemas.js';
import type { MobileBody, MobileCodeBody, ResetPasswordBody } from '../common/types.js';

export async function passwordRoutes(app: FastifyInstance) {
  app.post<{ Body: MobileBody }>('/api/auth/forgot-password', { schema: { body: mobileBodySchema } }, controller.forgotPassword);
  app.post<{ Body: MobileCodeBody }>('/api/auth/verify-reset-otp', { schema: { body: mobileCodeSchema } }, controller.verifyResetOtp);
  app.post<{ Body: ResetPasswordBody }>('/api/auth/reset-password', { schema: { body: resetPasswordSchema } }, controller.resetPassword);
}
