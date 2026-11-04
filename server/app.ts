
import Fastify from 'fastify';

import { config } from './src/config/index.js';

import {
  HttpError,
  rejectUnsafeOrigin,
} from './src/lib/http.js';

import { routes } from './src/modules/routes.js';

import { setupPayloadEncryption } from './src/lib/payload-crypto.js';

export function makeApp() {
  const app = Fastify({
    logger: {
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers.set-cookie',
      ],
    },
    bodyLimit: 16 * 1024,
  });

  app.addHook('onRequest', async (req, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Cache-Control', 'no-store');

    reply.header(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'"
    );

    if (req.method === 'OPTIONS') {
      if (req.headers.origin !== config.origin) {
        return reply.code(403).send({
          error: 'Forbidden',
        });
      }

      reply.header(
        'Access-Control-Allow-Origin',
        config.origin
      );

      reply.header(
        'Access-Control-Allow-Credentials',
        'true'
      );

      reply.header(
        'Access-Control-Allow-Methods',
        'GET,POST,DELETE,OPTIONS'
      );

      reply.header(
        'Access-Control-Allow-Headers',
        'Content-Type'
      );

      reply.header('Vary', 'Origin');

      return reply.code(204).send();
    }

    if (req.headers.origin === config.origin) {
      reply.header(
        'Access-Control-Allow-Origin',
        config.origin
      );

      reply.header(
        'Access-Control-Allow-Credentials',
        'true'
      );

      reply.header('Vary', 'Origin');
    }

    rejectUnsafeOrigin(req);
  });

  app.setErrorHandler((err: unknown, req, reply) => {
    if (err instanceof HttpError) {
      return reply.code(err.status).send({
        error: {
          code: err.code,
          message: err.message,
        },
      });
    }

    if (typeof err === 'object' && err !== null) {
      if ('validation' in err && err.validation) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
          },
        });
      }

      if ('code' in err && err.code === '23505') {
        return reply.code(409).send({
          error: {
            code: 'CONFLICT',
            message: 'Already exists',
          },
        });
      }
    }

    req.log.error(err);

    return reply.code(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });

  setupPayloadEncryption(app);

  app.register(routes);

  return app;
}
