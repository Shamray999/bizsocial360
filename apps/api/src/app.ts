import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { corsOrigins, env } from './config/env.js';
import { registerSwagger } from './plugins/swagger.js';
import { registerRoutes } from './routes/index.js';

/**
 * Builds and configures the Fastify application instance.
 * Kept separate from `server.ts` so it can be reused in tests.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
            }
          : undefined,
    },
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: corsOrigins });

  await registerSwagger(app);
  await registerRoutes(app);

  return app;
}
