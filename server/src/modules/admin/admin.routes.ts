import type { FastifyInstance } from 'fastify';
import * as controller from './admin.controller.js';

export async function adminRoutes(app: FastifyInstance) {
  app.get('/api/admin/stats', controller.stats);
  app.get('/api/admin/users', controller.listUsers);
  app.get<{ Params: { id: string } }>('/api/admin/users/:id', controller.getUser);
  app.get<{ Params: { id: string } }>('/api/admin/users/:id/sessions', controller.userSessions);
  app.post<{ Params: { id: string } }>('/api/admin/users/:id/logout-all', controller.logoutAll);
  app.post<{ Params: { id: string }; Body: { reason?: string } }>('/api/admin/users/:id/disable', controller.disableUser);
  app.post<{ Params: { id: string } }>('/api/admin/users/:id/enable', controller.enableUser);
}
