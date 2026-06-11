import type { FastifyInstance } from 'fastify';
import { isPlatform, type Platform } from '@bizsocial360/shared';
import {
  sampleAccounts,
  sampleContentInsights,
  samplePendingComments,
  samplePublishWindows,
  sampleRecommendations,
  summarizeEngagement,
} from '../../services/sample-data.js';

interface PlatformQuery {
  platform?: string;
}

function parsePlatform(value?: string): Platform | undefined {
  if (value && isPlatform(value)) {
    return value;
  }
  return undefined;
}

/**
 * Public API v1. Read-only engagement insights for external consumers.
 * Currently backed by deterministic sample data; swap for Prisma-backed
 * services once provider ingestion lands (Phase 3).
 */
export async function publicApiV1Routes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: PlatformQuery }>(
    '/accounts',
    {
      schema: {
        tags: ['accounts'],
        summary: 'List connected social accounts',
        querystring: {
          type: 'object',
          properties: {
            platform: { type: 'string', enum: ['FACEBOOK', 'INSTAGRAM', 'TIKTOK'] },
          },
        },
      },
    },
    async (request) => {
      const platform = parsePlatform(request.query.platform);
      const accounts = platform
        ? sampleAccounts.filter((account) => account.platform === platform)
        : sampleAccounts;
      return { data: accounts };
    },
  );

  app.get<{ Querystring: PlatformQuery }>(
    '/insights/summary',
    {
      schema: {
        tags: ['insights'],
        summary: 'Aggregated engagement summary',
        querystring: {
          type: 'object',
          properties: {
            platform: { type: 'string', enum: ['FACEBOOK', 'INSTAGRAM', 'TIKTOK'] },
          },
        },
      },
    },
    async (request) => {
      const platform = parsePlatform(request.query.platform);
      const insights = platform
        ? sampleContentInsights.filter((item) => item.platform === platform)
        : sampleContentInsights;
      return { data: summarizeEngagement(insights) };
    },
  );

  app.get<{ Querystring: PlatformQuery }>(
    '/insights/content',
    {
      schema: {
        tags: ['insights'],
        summary: 'Per-post / per-story engagement insights',
        querystring: {
          type: 'object',
          properties: {
            platform: { type: 'string', enum: ['FACEBOOK', 'INSTAGRAM', 'TIKTOK'] },
          },
        },
      },
    },
    async (request) => {
      const platform = parsePlatform(request.query.platform);
      const insights = platform
        ? sampleContentInsights.filter((item) => item.platform === platform)
        : sampleContentInsights;
      return { data: insights };
    },
  );

  app.get(
    '/insights/recommendations',
    {
      schema: {
        tags: ['insights'],
        summary: 'AI-generated insight recommendations',
      },
    },
    async () => ({ data: sampleRecommendations }),
  );

  app.get<{ Querystring: PlatformQuery }>(
    '/insights/publish-windows',
    {
      schema: {
        tags: ['insights'],
        summary: 'Recommended publishing windows',
        querystring: {
          type: 'object',
          properties: {
            platform: { type: 'string', enum: ['FACEBOOK', 'INSTAGRAM', 'TIKTOK'] },
          },
        },
      },
    },
    async (request) => {
      const platform = parsePlatform(request.query.platform);
      const windows = platform
        ? samplePublishWindows.filter((item) => item.platform === platform)
        : samplePublishWindows;
      return { data: windows };
    },
  );

  app.get<{ Querystring: PlatformQuery }>(
    '/comments',
    {
      schema: {
        tags: ['comments'],
        summary: 'Customer comments awaiting a response',
        querystring: {
          type: 'object',
          properties: {
            platform: { type: 'string', enum: ['FACEBOOK', 'INSTAGRAM', 'TIKTOK'] },
          },
        },
      },
    },
    async (request) => {
      const platform = parsePlatform(request.query.platform);
      const comments = platform
        ? samplePendingComments.filter((item) => item.platform === platform)
        : samplePendingComments;
      return { data: comments };
    },
  );
}
