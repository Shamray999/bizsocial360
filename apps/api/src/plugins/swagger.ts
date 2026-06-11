import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

/**
 * Registers OpenAPI generation and the Swagger UI explorer.
 * The generated spec backs the public API contract used by external
 * consumers and is the source of truth for contract tests.
 */
export async function registerSwagger(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'BizSocial360 Public API',
        description:
          'Engagement insights across Facebook, Instagram, and TikTok — metrics, the customer comment response queue, and publish-time recommendations.',
        version: '0.1.0',
      },
      servers: [{ url: '/', description: 'Current host' }],
      tags: [
        { name: 'system', description: 'Health and readiness probes' },
        { name: 'accounts', description: 'Connected social accounts' },
        { name: 'insights', description: 'Engagement metrics and recommendations' },
        { name: 'comments', description: 'Customer comment response queue' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
  });
}
