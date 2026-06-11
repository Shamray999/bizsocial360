import type {
  ContentInsight,
  EngagementMetrics,
  InsightRecommendation,
  PendingComment,
  Platform,
  PublishWindowRecommendation,
  SocialAccountSummary,
} from '@bizsocial360/shared';
import { isDatabaseConfigured, prisma } from '../db/client.js';
import {
  sampleAccounts,
  sampleContentInsights,
  samplePendingComments,
  samplePublishWindows,
  sampleRecommendations,
  summarizeEngagement,
} from './sample-data.js';

/**
 * Read service backing the dashboard, public API, and MCP tools (ADR-0005).
 *
 * Two modes:
 * - **Demo mode** — no database, no default organization, or an organization
 *   with zero connected accounts: returns the deterministic sample data so the
 *   stack runs end-to-end before any account is connected.
 * - **Connected mode** — a default organization with ≥1 connected account:
 *   returns that organization's real, Prisma-backed data (possibly empty until
 *   the first ingestion sync runs).
 *
 * Publish windows and recommendations are read from their tables and fall back
 * to sample placeholders until the Phase 4 computation populates them.
 */

function filterByPlatform<T extends { platform: Platform }>(
  items: T[],
  platform?: Platform,
): T[] {
  return platform ? items.filter((item) => item.platform === platform) : items;
}

/** Resolves the active organization for the (currently single-tenant) dashboard. */
async function resolveDefaultOrganizationId(): Promise<string | null> {
  if (!isDatabaseConfigured) {
    return null;
  }
  const org = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
  return org?.id ?? null;
}

/** Returns the org id only when in connected mode (≥1 account), else null. */
async function connectedOrganizationId(): Promise<string | null> {
  const organizationId = await resolveDefaultOrganizationId();
  if (!organizationId) {
    return null;
  }
  const accountCount = await prisma.socialAccount.count({ where: { organizationId } });
  return accountCount > 0 ? organizationId : null;
}

export async function getAccounts(platform?: Platform): Promise<SocialAccountSummary[]> {
  const organizationId = await connectedOrganizationId();
  if (!organizationId) {
    return filterByPlatform(sampleAccounts, platform);
  }
  const accounts = await prisma.socialAccount.findMany({
    where: { organizationId, ...(platform ? { platform } : {}) },
    orderBy: { createdAt: 'asc' },
  });
  return accounts.map((account) => ({
    id: account.id,
    platform: account.platform,
    handle: account.handle,
    displayName: account.displayName,
    followers: account.followers,
    connected: account.connected,
  }));
}

export async function getContentInsights(platform?: Platform): Promise<ContentInsight[]> {
  const organizationId = await connectedOrganizationId();
  if (!organizationId) {
    return filterByPlatform(sampleContentInsights, platform);
  }
  const posts = await prisma.post.findMany({
    where: { account: { organizationId, ...(platform ? { platform } : {}) } },
    include: {
      account: { select: { platform: true } },
      metrics: { orderBy: { capturedAt: 'desc' }, take: 1 },
    },
    orderBy: { publishedAt: 'desc' },
    take: 50,
  });

  return posts.map((post) => {
    const latest = post.metrics[0];
    const metrics: EngagementMetrics = {
      impressions: latest?.impressions ?? 0,
      reach: latest?.reach ?? 0,
      views: latest?.views ?? 0,
      likes: latest?.likes ?? 0,
      comments: latest?.comments ?? 0,
      shares: latest?.shares ?? 0,
      saves: latest?.saves ?? 0,
      engagementRate: latest?.engagementRate ?? 0,
    };
    return {
      id: post.id,
      platform: post.account.platform,
      contentType: post.contentType,
      caption: post.caption,
      permalink: post.permalink ?? '',
      publishedAt: post.publishedAt.toISOString(),
      metrics,
    };
  });
}

export async function getEngagementSummary(platform?: Platform): Promise<EngagementMetrics> {
  const insights = await getContentInsights(platform);
  return summarizeEngagement(insights);
}

export async function getPendingComments(platform?: Platform): Promise<PendingComment[]> {
  const organizationId = await connectedOrganizationId();
  if (!organizationId) {
    return filterByPlatform(samplePendingComments, platform);
  }
  const comments = await prisma.comment.findMany({
    where: {
      account: { organizationId, ...(platform ? { platform } : {}) },
      status: { in: ['NEW', 'PENDING'] },
    },
    include: { account: { select: { platform: true } } },
    orderBy: { receivedAt: 'asc' },
    take: 100,
  });

  const now = Date.now();
  return comments.map((comment) => ({
    id: comment.id,
    platform: comment.account.platform,
    author: comment.author,
    message: comment.message,
    receivedAt: comment.receivedAt.toISOString(),
    status: comment.status,
    waitingMinutes: Math.max(0, Math.floor((now - comment.receivedAt.getTime()) / 60000)),
  }));
}

export async function getPublishWindows(
  platform?: Platform,
): Promise<PublishWindowRecommendation[]> {
  const organizationId = await connectedOrganizationId();
  if (!organizationId) {
    return filterByPlatform(samplePublishWindows, platform);
  }
  const windows = await prisma.publishWindow.findMany({
    where: { account: { organizationId, ...(platform ? { platform } : {}) } },
    include: { account: { select: { platform: true } } },
    orderBy: { confidence: 'desc' },
    take: 20,
  });
  // No computed windows yet (Phase 4): fall back to sample placeholders.
  if (windows.length === 0) {
    return filterByPlatform(samplePublishWindows, platform);
  }
  return windows.map((window) => ({
    platform: window.account.platform,
    contentType: window.contentType,
    dayOfWeek: window.dayOfWeek,
    hourOfDay: window.hourOfDay,
    confidence: window.confidence,
    expectedEngagementRate: window.expectedEngagementRate,
  }));
}

export async function getRecommendations(): Promise<InsightRecommendation[]> {
  const organizationId = await connectedOrganizationId();
  if (!organizationId) {
    return sampleRecommendations;
  }
  const recommendations = await prisma.insightRecommendation.findMany({
    where: { organizationId },
    orderBy: { generatedAt: 'desc' },
    take: 20,
  });
  // No generated recommendations yet (Phase 4): fall back to sample placeholders.
  if (recommendations.length === 0) {
    return sampleRecommendations;
  }
  return recommendations.map((rec) => ({
    id: rec.id,
    title: rec.title,
    summary: rec.summary,
    confidence: rec.confidence,
    sources: rec.sources,
    generatedAt: rec.generatedAt.toISOString(),
  }));
}
