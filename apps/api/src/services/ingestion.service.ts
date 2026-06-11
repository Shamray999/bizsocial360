import type { Platform } from '@bizsocial360/shared';
import { isDatabaseConfigured, prisma } from '../db/client.js';
import { getProviderAdapter } from '../integrations/index.js';
import type {
  ProviderComment,
  ProviderContent,
  ProviderTokens,
} from '../integrations/types.js';
import { decryptSecret } from '../security/token-crypto.js';

/** Per-account ingestion tallies returned to the caller. */
export interface SyncCounts {
  posts: number;
  stories: number;
  comments: number;
}

export interface AccountSyncResult extends SyncCounts {
  accountId: string;
  platform: Platform;
  handle: string;
  ok: boolean;
  error?: string;
}

export interface OrganizationSyncResult {
  accounts: AccountSyncResult[];
  totals: SyncCounts;
}

/** Raised when ingestion is attempted without a database configured. */
export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super('No database is configured. Set DATABASE_URL to ingest provider data.');
    this.name = 'DatabaseNotConfiguredError';
  }
}

/** Retries a transient operation with exponential backoff. */
async function withRetry<T>(
  operation: () => Promise<T>,
  { retries = 3, baseMs = 300 }: { retries?: number; baseMs?: number } = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        break;
      }
      const delay = baseMs * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

function engagementRate(metrics: ProviderContent['metrics']): number {
  const interactions = metrics.likes + metrics.comments + metrics.shares + metrics.saves;
  const rate = metrics.reach > 0 ? interactions / metrics.reach : 0;
  return Number(rate.toFixed(4));
}

/** Ingests all connected accounts for an organization. */
export async function syncOrganization(organizationId: string): Promise<OrganizationSyncResult> {
  if (!isDatabaseConfigured) {
    throw new DatabaseNotConfiguredError();
  }

  const accounts = await prisma.socialAccount.findMany({
    where: { organizationId, connected: true },
    include: { oauthToken: true },
    orderBy: { createdAt: 'asc' },
  });

  const results: AccountSyncResult[] = [];
  // Sequential per account keeps us well within provider rate limits.
  for (const account of accounts) {
    results.push(await syncOneAccount(account));
  }

  const totals = results.reduce<SyncCounts>(
    (acc, result) => ({
      posts: acc.posts + result.posts,
      stories: acc.stories + result.stories,
      comments: acc.comments + result.comments,
    }),
    { posts: 0, stories: 0, comments: 0 },
  );

  return { accounts: results, totals };
}

type AccountWithToken = {
  id: string;
  platform: Platform;
  externalId: string;
  handle: string;
  oauthToken: { accessToken: string; refreshToken: string | null; scope: string | null; expiresAt: Date | null } | null;
};

async function syncOneAccount(account: AccountWithToken): Promise<AccountSyncResult> {
  const base: AccountSyncResult = {
    accountId: account.id,
    platform: account.platform,
    handle: account.handle,
    posts: 0,
    stories: 0,
    comments: 0,
    ok: true,
  };

  if (!account.oauthToken) {
    return { ...base, ok: false, error: 'No stored OAuth token; reconnect the account.' };
  }

  const adapter = getProviderAdapter(account.platform);
  if (!adapter.isConfigured()) {
    return { ...base, ok: false, error: `Provider ${account.platform} is not configured.` };
  }
  if (!adapter.fetchContent) {
    return { ...base, ok: false, error: `Ingestion is not implemented for ${account.platform}.` };
  }

  const tokens: ProviderTokens = {
    accessToken: decryptSecret(account.oauthToken.accessToken),
    refreshToken: account.oauthToken.refreshToken
      ? decryptSecret(account.oauthToken.refreshToken)
      : undefined,
    scope: account.oauthToken.scope ?? undefined,
    expiresAt: account.oauthToken.expiresAt ?? undefined,
  };
  const ref = { externalId: account.externalId, tokens };

  try {
    const content = await withRetry(() => adapter.fetchContent!(ref));
    const counts = await persistContent(account.id, content);

    let commentCount = 0;
    if (adapter.fetchComments) {
      const comments = await withRetry(() => adapter.fetchComments!(ref));
      commentCount = await persistComments(account.id, comments);
    }

    return { ...base, posts: counts.posts, stories: counts.stories, comments: commentCount };
  } catch (error) {
    return { ...base, ok: false, error: error instanceof Error ? error.message : 'Sync failed.' };
  }
}

async function persistContent(
  accountId: string,
  content: ProviderContent[],
): Promise<{ posts: number; stories: number }> {
  let posts = 0;
  let stories = 0;

  for (const item of content) {
    if (item.isStory) {
      const story = await prisma.story.upsert({
        where: { accountId_externalId: { accountId, externalId: item.externalId } },
        create: {
          accountId,
          externalId: item.externalId,
          publishedAt: item.publishedAt,
          expiresAt: item.expiresAt ?? null,
        },
        update: { publishedAt: item.publishedAt, expiresAt: item.expiresAt ?? null },
      });
      await prisma.storyMetric.create({
        data: {
          storyId: story.id,
          impressions: item.metrics.impressions,
          reach: item.metrics.reach,
          views: item.metrics.views,
          replies: item.metrics.comments,
        },
      });
      stories += 1;
    } else {
      const post = await prisma.post.upsert({
        where: { accountId_externalId: { accountId, externalId: item.externalId } },
        create: {
          accountId,
          externalId: item.externalId,
          contentType: item.contentType,
          caption: item.caption,
          permalink: item.permalink ?? null,
          publishedAt: item.publishedAt,
        },
        update: {
          contentType: item.contentType,
          caption: item.caption,
          permalink: item.permalink ?? null,
          publishedAt: item.publishedAt,
        },
      });
      await prisma.postMetric.create({
        data: {
          postId: post.id,
          impressions: item.metrics.impressions,
          reach: item.metrics.reach,
          views: item.metrics.views,
          likes: item.metrics.likes,
          comments: item.metrics.comments,
          shares: item.metrics.shares,
          saves: item.metrics.saves,
          engagementRate: engagementRate(item.metrics),
        },
      });
      posts += 1;
    }
  }

  return { posts, stories };
}

async function persistComments(accountId: string, comments: ProviderComment[]): Promise<number> {
  let count = 0;
  for (const comment of comments) {
    // Resolve the parent post within this account, when we have its external id.
    const post = comment.contentExternalId
      ? await prisma.post.findUnique({
          where: { accountId_externalId: { accountId, externalId: comment.contentExternalId } },
          select: { id: true },
        })
      : null;

    await prisma.comment.upsert({
      where: { accountId_externalId: { accountId, externalId: comment.externalId } },
      create: {
        accountId,
        postId: post?.id ?? null,
        externalId: comment.externalId,
        author: comment.author,
        message: comment.message,
        receivedAt: comment.receivedAt,
      },
      // Don't clobber triage status (NEW/PENDING/RESPONDED) on re-sync.
      update: { author: comment.author, message: comment.message, postId: post?.id ?? null },
    });
    count += 1;
  }
  return count;
}
