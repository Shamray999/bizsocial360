import type { FastifyInstance } from 'fastify';
import { isDatabaseConfigured } from '../db/client.js';

/** Liveness and readiness probes used by cloud health checks. */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/health',
    {
      schema: {
        tags: ['system'],
        summary: 'Liveness probe',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              uptime: { type: 'number' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async () => ({
      status: 'ok',
      uptime: Number(process.uptime().toFixed(2)),
      timestamp: new Date().toISOString(),
    }),
  );

  app.get(
    '/ready',
    {
      schema: {
        tags: ['system'],
        summary: 'Readiness probe',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              database: { type: 'string' },
            },
          },
        },
      },
    },
    async () => ({
      status: 'ready',
      database: isDatabaseConfigured ? 'configured' : 'not-configured',
    }),
  );
}
