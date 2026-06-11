import type { FastifyInstance } from 'fastify';
import { isPlatform, type Platform } from '@bizsocial360/shared';
import {
  getAccounts,
  getContentInsights,
  getEngagementSummary,
  getPendingComments,
  getPublishWindows,
  getRecommendations,
} from '../../services/insights.service.js';

interface PlatformQuery {
  platform?: string;
}

function parsePlatform(value?: string): Platform | undefined {
  if (value && isPlatform(value)) {
    return value;
  }
  return undefined;
}

const platformQuerySchema = {
  type: 'object',
  properties: {
    platform: { type: 'string', enum: ['FACEBOOK', 'INSTAGRAM', 'TIKTOK'] },
  },
} as const;

/**
 * Public API v1. Read-only engagement insights for external consumers.
 * Thin adapter over the shared insights service (ADR-0005): returns the active
 * organization's Prisma-backed data once accounts are connected, and falls back
 * to deterministic sample data in demo mode.
 */
export async function publicApiV1Routes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: PlatformQuery }>(
    '/accounts',
    {
      schema: {
        tags: ['accounts'],
        summary: 'List connected social accounts',
        querystring: platformQuerySchema,
      },
    },
    async (request) => ({ data: await getAccounts(parsePlatform(request.query.platform)) }),
  );

  app.get<{ Querystring: PlatformQuery }>(
    '/insights/summary',
    {
      schema: {
        tags: ['insights'],
        summary: 'Aggregated engagement summary',
        querystring: platformQuerySchema,
      },
    },
    async (request) => ({
      data: await getEngagementSummary(parsePlatform(request.query.platform)),
    }),
  );

  app.get<{ Querystring: PlatformQuery }>(
    '/insights/content',
    {
      schema: {
        tags: ['insights'],
        summary: 'Per-post / per-story engagement insights',
        querystring: platformQuerySchema,
      },
    },
    async (request) => ({
      data: await getContentInsights(parsePlatform(request.query.platform)),
    }),
  );

  app.get(
    '/insights/recommendations',
    {
      schema: {
        tags: ['insights'],
        summary: 'AI-generated insight recommendations',
      },
    },
    async () => ({ data: await getRecommendations() }),
  );

  app.get<{ Querystring: PlatformQuery }>(
    '/insights/publish-windows',
    {
      schema: {
        tags: ['insights'],
        summary: 'Recommended publishing windows',
        querystring: platformQuerySchema,
      },
    },
    async (request) => ({
      data: await getPublishWindows(parsePlatform(request.query.platform)),
    }),
  );

  app.get<{ Querystring: PlatformQuery }>(
    '/comments',
    {
      schema: {
        tags: ['comments'],
        summary: 'Customer comments awaiting a response',
        querystring: platformQuerySchema,
      },
    },
    async (request) => ({
      data: await getPendingComments(parsePlatform(request.query.platform)),
    }),
  );
}
