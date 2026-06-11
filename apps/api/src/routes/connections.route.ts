import type { FastifyInstance, FastifyReply } from 'fastify';
import { isPlatform, type Platform } from '@bizsocial360/shared';
import { corsOrigins } from '../config/env.js';
import { ProviderNotConfiguredError } from '../integrations/index.js';
import {
  buildAuthorizationUrl,
  disconnectAccount,
  handleOAuthCallback,
  listConnections,
  AccountNotFoundError,
  DatabaseNotConfiguredError,
} from '../services/connections.service.js';

/** Maps a lowercase URL segment (e.g. `facebook`) to a Platform enum value. */
function parsePlatformParam(value: string): Platform | undefined {
  const upper = value.toUpperCase();
  return isPlatform(upper) ? upper : undefined;
}

const webAppUrl = corsOrigins[0] ?? 'http://localhost:3000';

/**
 * Provider OAuth (account connection) routes.
 *
 * These are internal routes — kept off the versioned public API because they
 * redirect to providers and touch secrets. Tokens are never returned here.
 *
 * Security model: the flow-start, list, and disconnect endpoints require an
 * authenticated session and derive the organization from it (ADR-0004). The
 * callback is intentionally unauthenticated because the provider redirects the
 * browser to it with no bearer token; it instead trusts the HMAC-signed OAuth
 * `state` (CSRF protection) which carries the originating organization.
 */
export async function connectionRoutes(app: FastifyInstance): Promise<void> {
  // Step 1: start the OAuth flow. Returns the provider authorization URL as JSON
  // so the authenticated SPA (sending a Bearer token) can navigate to it; a
  // cross-origin redirect can't carry the Authorization header.
  app.get<{ Params: { platform: string } }>(
    '/connect/:platform',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['connections'],
        summary: 'Begin connecting a social account (returns the provider authorization URL)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { platform: { type: 'string', enum: ['facebook', 'instagram', 'tiktok'] } },
          required: ['platform'],
        },
      },
    },
    async (request, reply) => {
      const platform = parsePlatformParam(request.params.platform);
      if (!platform) {
        return reply.code(400).send({ error: 'Unknown platform.' });
      }
      try {
        const authorizationUrl = buildAuthorizationUrl({
          platform,
          organizationId: request.user.organizationId,
        });
        return { data: { authorizationUrl } };
      } catch (error) {
        return handleRouteError(reply, error);
      }
    },
  );

  // Step 2: provider redirects back here with an authorization code.
  app.get<{
    Params: { platform: string };
    Querystring: { code?: string; state?: string; error?: string; error_description?: string };
  }>(
    '/connect/:platform/callback',
    {
      schema: {
        tags: ['connections'],
        summary: 'OAuth callback — exchanges the code and stores the connection',
        params: {
          type: 'object',
          properties: { platform: { type: 'string' } },
          required: ['platform'],
        },
      },
    },
    async (request, reply) => {
      const platform = parsePlatformParam(request.params.platform);
      if (!platform) {
        return reply.code(400).send({ error: 'Unknown platform.' });
      }

      const { code, state, error, error_description: errorDescription } = request.query;
      if (error) {
        return reply.redirect(
          `${webAppUrl}/?connect_error=${encodeURIComponent(errorDescription ?? error)}`,
        );
      }
      if (!code || !state) {
        return reply.code(400).send({ error: 'Missing authorization code or state.' });
      }

      try {
        const result = await handleOAuthCallback({ platform, code, state });
        return reply.redirect(
          `${webAppUrl}/?connected=${platform.toLowerCase()}&accounts=${result.connected.length}`,
        );
      } catch (err) {
        // Log details server-side; show the dashboard a friendly message only.
        request.log.error({ err, platform }, 'OAuth callback failed');
        const message = err instanceof Error ? err.message : 'Connection failed.';
        return reply.redirect(`${webAppUrl}/?connect_error=${encodeURIComponent(message)}`);
      }
    },
  );

  // List currently connected accounts.
  app.get(
    '/connections',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['connections'],
        summary: 'List connected social accounts',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const data = await listConnections(request.user.organizationId);
        return { data };
      } catch (error) {
        return handleRouteError(reply, error);
      }
    },
  );

  // Disconnect an account and delete its stored token.
  app.delete<{ Params: { accountId: string } }>(
    '/connections/:accountId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['connections'],
        summary: 'Disconnect a social account and delete its stored token',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { accountId: { type: 'string' } },
          required: ['accountId'],
        },
      },
    },
    async (request, reply) => {
      try {
        await disconnectAccount(request.params.accountId, request.user.organizationId);
        return reply.code(204).send();
      } catch (error) {
        return handleRouteError(reply, error);
      }
    },
  );
}

function handleRouteError(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof ProviderNotConfiguredError) {
    return reply.code(501).send({ error: error.message });
  }
  if (error instanceof DatabaseNotConfiguredError) {
    return reply.code(503).send({ error: error.message });
  }
  if (error instanceof AccountNotFoundError) {
    return reply.code(404).send({ error: error.message });
  }
  const message = error instanceof Error ? error.message : 'Unexpected error.';
  return reply.code(500).send({ error: message });
}
