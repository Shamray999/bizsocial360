import type { FastifyInstance } from 'fastify';
import {
  DatabaseNotConfiguredError,
  syncOrganization,
} from '../services/ingestion.service.js';

/**
 * Ingestion route (Phase 3): pulls fresh content, metrics, and comments from
 * the connected providers into the database for the authenticated user's
 * organization. Protected by app auth (ADR-0004) and scoped to the session org.
 */
export async function syncRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/sync',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['connections'],
        summary: 'Ingest latest data from all connected accounts',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const result = await syncOrganization(request.user.organizationId);
        return { data: result };
      } catch (error) {
        if (error instanceof DatabaseNotConfiguredError) {
          return reply.code(503).send({ error: error.message });
        }
        request.log.error({ err: error }, 'Sync failed');
        const message = error instanceof Error ? error.message : 'Sync failed.';
        return reply.code(500).send({ error: message });
      }
    },
  );
}
