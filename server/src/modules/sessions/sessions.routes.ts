import type { FastifyInstance } from 'fastify';
import * as controller from './sessions.controller.js';
import { sessionIdSchema } from '../common/schemas.js';

export async function sessionRoutes(app: FastifyInstance) {
  app.get('/api/account/sessions', controller.listSessions);
  app.delete<{ Params: { id: string } }>('/api/account/sessions/:id', {
    schema: { params: sessionIdSchema },
  }, controller.revokeSession);
}
