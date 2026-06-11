import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  getEngagementSummary,
  getPendingComments,
  getPublishWindows,
} from '../services/insights.service.js';

/**
 * BizSocial360 MCP server.
 *
 * Exposes read-only dashboard insights as MCP tools so AI agents can query
 * engagement, the comment response queue, and publish-time recommendations.
 * Tools delegate to the same shared insights service as the REST API (ADR-0005),
 * so they return real Prisma-backed data once accounts are connected and sample
 * data in demo mode — without changing the AI-facing surface.
 */
const server = new McpServer({
  name: 'bizsocial360-mcp',
  version: '0.1.0',
});

const platformSchema = z
  .enum(['FACEBOOK', 'INSTAGRAM', 'TIKTOK'])
  .optional()
  .describe('Optional platform filter: FACEBOOK, INSTAGRAM, or TIKTOK.');

server.tool(
  'get_engagement_summary',
  'Return an aggregated engagement summary (impressions, reach, interactions, engagement rate), optionally filtered by platform.',
  { platform: platformSchema },
  async ({ platform }) => {
    const summary = await getEngagementSummary(platform);
    return {
      content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
    };
  },
);

server.tool(
  'list_pending_comments',
  'List customer comments awaiting a response, optionally filtered by platform, sorted by longest waiting first.',
  { platform: platformSchema },
  async ({ platform }) => {
    const comments = (await getPendingComments(platform))
      .slice()
      .sort((a, b) => b.waitingMinutes - a.waitingMinutes);
    return {
      content: [{ type: 'text', text: JSON.stringify(comments, null, 2) }],
    };
  },
);

server.tool(
  'get_publish_recommendations',
  'Return recommended publishing windows (day of week and hour) derived from historical engagement, optionally filtered by platform.',
  { platform: platformSchema },
  async ({ platform }) => {
    const windows = await getPublishWindows(platform);
    return {
      content: [{ type: 'text', text: JSON.stringify(windows, null, 2) }],
    };
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('BizSocial360 MCP server running on stdio');
}

void main();
