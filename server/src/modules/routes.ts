
import type { FastifyInstance } from 'fastify';

import { authRoutes } from './auth/auth.routes.js';
import { passwordRoutes } from './password/password.routes.js';
import { accountRoutes } from './account/account.routes.js';
import { sessionRoutes } from './sessions/sessions.routes.js';
import { adminRoutes } from './admin/admin.routes.js';

export async function routes(app: FastifyInstance) {

  app.get('/', async () => {
    return {
      success: true,
      message: 'AuthLab API is running',
      version: '1.0.0',
    };
  });

  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'AuthLab Backend',
    };
  });

  // Authentication modules
  await app.register(authRoutes);
  await app.register(passwordRoutes);
  await app.register(accountRoutes);
  await app.register(sessionRoutes);
  await app.register(adminRoutes);
}
