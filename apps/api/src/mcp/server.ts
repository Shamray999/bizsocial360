import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  samplePendingComments,
  samplePublishWindows,
  sampleContentInsights,
  summarizeEngagement,
} from '../services/sample-data.js';

/**
 * BizSocial360 MCP server.
 *
 * Exposes read-only dashboard insights as MCP tools so AI agents can query
 * engagement, the comment response queue, and publish-time recommendations.
 * Backed by sample data today; the same tool contracts will later call the
 * Prisma-backed services without changing the AI-facing surface.
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
    const insights = platform
      ? sampleContentInsights.filter((item) => item.platform === platform)
      : sampleContentInsights;
    return {
      content: [{ type: 'text', text: JSON.stringify(summarizeEngagement(insights), null, 2) }],
    };
  },
);

server.tool(
  'list_pending_comments',
  'List customer comments awaiting a response, optionally filtered by platform, sorted by longest waiting first.',
  { platform: platformSchema },
  async ({ platform }) => {
    const comments = (
      platform
        ? samplePendingComments.filter((item) => item.platform === platform)
        : samplePendingComments
    )
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
    const windows = platform
      ? samplePublishWindows.filter((item) => item.platform === platform)
      : samplePublishWindows;
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
