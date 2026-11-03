import type { FastifyInstance } from 'fastify';
import * as controller from './account.controller.js';
import { changePasswordSchema, changeMobileSchema, confirmMobileSchema } from '../common/schemas.js';
import type { ChangePasswordBody, ChangeMobileBody, ConfirmMobileBody } from '../common/types.js';

export async function accountRoutes(app: FastifyInstance) {
  app.post<{ Body: ChangePasswordBody }>('/api/account/change-password', { schema: { body: changePasswordSchema } }, controller.changePassword);
  app.post<{ Body: ChangeMobileBody }>('/api/account/mobile-change/request', { schema: { body: changeMobileSchema } }, controller.requestMobileChange);
  app.post<{ Body: ConfirmMobileBody }>('/api/account/mobile-change/confirm', { schema: { body: confirmMobileSchema } }, controller.confirmMobileChange);
}
