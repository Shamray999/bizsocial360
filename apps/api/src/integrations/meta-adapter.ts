import type { Platform } from '@bizsocial360/shared';
import { env } from '../config/env.js';
import {
  ProviderOAuthError,
  type AuthorizationUrlParams,
  type ExchangeCodeParams,
  type ProviderAccount,
  type ProviderAccountRef,
  type ProviderComment,
  type ProviderContent,
  type ProviderContentMetrics,
  type ProviderTokens,
  type SocialProviderAdapter,
} from './types.js';

type MetaPlatform = Extract<Platform, 'FACEBOOK' | 'INSTAGRAM'>;

/** Least-privilege scopes per platform for reading engagement insights. */
const SCOPES: Record<MetaPlatform, string[]> = {
  FACEBOOK: ['public_profile', 'pages_show_list', 'pages_read_engagement', 'read_insights'],
  INSTAGRAM: [
    'public_profile',
    'pages_show_list',
    'instagram_basic',
    'instagram_manage_insights',
    'pages_read_engagement',
  ],
};

interface MetaPage {
  id: string;
  name: string;
  username?: string;
  fan_count?: number;
  followers_count?: number;
  access_token: string;
  instagram_business_account?: {
    id: string;
    username?: string;
    name?: string;
    followers_count?: number;
  };
}

interface MetaTokenResponse {
  access_token: string;
  expires_in?: number;
}

interface IgMedia {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
}

interface FbPost {
  id: string;
  message?: string;
  permalink_url?: string;
  created_time?: string;
  shares?: { count?: number };
  likes?: { summary?: { total_count?: number } };
  comments?: { summary?: { total_count?: number } };
}

interface InsightsResponse {
  data?: { name: string; values?: { value?: number }[] }[];
}

interface IgComment {
  id: string;
  text?: string;
  username?: string;
  timestamp?: string;
}

interface FbComment {
  id: string;
  message?: string;
  from?: { name?: string };
  created_time?: string;
}

/**
 * Adapter for the Meta Graph API.
 *
 * A single Meta app serves both Facebook Pages and the Instagram Business
 * accounts linked to them, so the adapter is instantiated per platform to
 * register the correct account type after the shared OAuth flow completes.
 */
export class MetaAdapter implements SocialProviderAdapter {
  constructor(public readonly platform: MetaPlatform) {}

  private get graphBase(): string {
    return `https://graph.facebook.com/${env.META_GRAPH_VERSION}`;
  }

  isConfigured(): boolean {
    return Boolean(env.META_APP_ID && env.META_APP_SECRET);
  }

  getAuthorizationUrl({ state, redirectUri }: AuthorizationUrlParams): string {
    const params = new URLSearchParams({
      client_id: env.META_APP_ID ?? '',
      redirect_uri: redirectUri,
      state,
      response_type: 'code',
      scope: SCOPES[this.platform].join(','),
    });
    return `https://www.facebook.com/${env.META_GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
  }

  async exchangeCode({ code, redirectUri }: ExchangeCodeParams): Promise<ProviderTokens> {
    // 1) Exchange the authorization code for a short-lived user token.
    const shortLived = await this.graphRequest<MetaTokenResponse>('/oauth/access_token', {
      client_id: env.META_APP_ID ?? '',
      client_secret: env.META_APP_SECRET ?? '',
      redirect_uri: redirectUri,
      code,
    });

    // 2) Upgrade to a long-lived token (~60 days) for durable background sync.
    const longLived = await this.graphRequest<MetaTokenResponse>('/oauth/access_token', {
      grant_type: 'fb_exchange_token',
      client_id: env.META_APP_ID ?? '',
      client_secret: env.META_APP_SECRET ?? '',
      fb_exchange_token: shortLived.access_token,
    });

    return {
      accessToken: longLived.access_token,
      scope: SCOPES[this.platform].join(','),
      expiresAt: longLived.expires_in
        ? new Date(Date.now() + longLived.expires_in * 1000)
        : undefined,
    };
  }

  async fetchAccounts(tokens: ProviderTokens): Promise<ProviderAccount[]> {
    const fields =
      this.platform === 'INSTAGRAM'
        ? 'id,name,access_token,instagram_business_account{id,username,name,followers_count}'
        : 'id,name,username,fan_count,access_token';

    const { data } = await this.graphRequest<{ data: MetaPage[] }>('/me/accounts', {
      access_token: tokens.accessToken,
      fields,
    });

    if (this.platform === 'INSTAGRAM') {
      return data
        .filter((page): page is MetaPage & { instagram_business_account: NonNullable<MetaPage['instagram_business_account']> } =>
          Boolean(page.instagram_business_account),
        )
        .map((page) => {
          const ig = page.instagram_business_account;
          return {
            platform: 'INSTAGRAM' as const,
            externalId: ig.id,
            handle: ig.username ?? ig.id,
            displayName: ig.name ?? ig.username ?? ig.id,
            followers: ig.followers_count ?? 0,
            // Instagram Business insights are read with the linked Page token.
            tokens: {
              accessToken: page.access_token,
              scope: tokens.scope,
              expiresAt: tokens.expiresAt,
            },
          };
        });
    }

    return data.map((page) => ({
      platform: 'FACEBOOK' as const,
      externalId: page.id,
      handle: page.username ?? page.id,
      displayName: page.name,
      followers: page.fan_count ?? page.followers_count ?? 0,
      tokens: {
        accessToken: page.access_token,
        scope: tokens.scope,
        expiresAt: tokens.expiresAt,
      },
    }));
  }

  private async graphRequest<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = `${this.graphBase}${path}?${new URLSearchParams(params).toString()}`;
    const response = await fetch(url);
    const body = (await response.json()) as T & { error?: { message?: string } };
    if (!response.ok || body.error) {
      throw new ProviderOAuthError(
        body.error?.message ?? `Meta Graph API error (HTTP ${response.status})`,
        this.platform,
      );
    }
    return body;
  }

  async fetchContent(account: ProviderAccountRef): Promise<ProviderContent[]> {
    return this.platform === 'INSTAGRAM'
      ? this.fetchInstagramContent(account)
      : this.fetchFacebookContent(account);
  }

  async fetchComments(account: ProviderAccountRef): Promise<ProviderComment[]> {
    return this.platform === 'INSTAGRAM'
      ? this.fetchInstagramComments(account)
      : this.fetchFacebookComments(account);
  }

  private async fetchInstagramContent(account: ProviderAccountRef): Promise<ProviderContent[]> {
    const { data = [] } = await this.graphRequest<{ data: IgMedia[] }>(
      `/${account.externalId}/media`,
      {
        access_token: account.tokens.accessToken,
        fields:
          'id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count',
        limit: '25',
      },
    );

    const content: ProviderContent[] = [];
    for (const media of data) {
      const isStory = media.media_product_type === 'STORY';
      const contentType: ProviderContent['contentType'] =
        media.media_product_type === 'STORY'
          ? 'STORY'
          : media.media_product_type === 'REELS'
            ? 'REEL'
            : media.media_type === 'VIDEO'
              ? 'VIDEO'
              : 'POST';

      const metricNames = isStory
        ? ['impressions', 'reach', 'replies']
        : contentType === 'REEL'
          ? ['reach', 'plays', 'saved']
          : ['impressions', 'reach', 'saved'];
      const insights = await this.safeInsights(media.id, metricNames, account.tokens.accessToken);

      content.push({
        externalId: media.id,
        contentType,
        caption: media.caption ?? '',
        permalink: media.permalink,
        publishedAt: media.timestamp ? new Date(media.timestamp) : new Date(),
        isStory,
        metrics: {
          impressions: insights.impressions ?? 0,
          reach: insights.reach ?? 0,
          views: insights.plays ?? 0,
          likes: media.like_count ?? 0,
          comments: media.comments_count ?? 0,
          shares: 0,
          saves: insights.saved ?? 0,
        },
      });
    }
    return content;
  }

  private async fetchFacebookContent(account: ProviderAccountRef): Promise<ProviderContent[]> {
    const { data = [] } = await this.graphRequest<{ data: FbPost[] }>(
      `/${account.externalId}/published_posts`,
      {
        access_token: account.tokens.accessToken,
        fields:
          'id,message,permalink_url,created_time,shares,likes.summary(true),comments.summary(true)',
        limit: '25',
      },
    );

    const content: ProviderContent[] = [];
    for (const post of data) {
      const insights = await this.safeInsights(
        post.id,
        ['post_impressions', 'post_impressions_unique'],
        account.tokens.accessToken,
      );
      const metrics: ProviderContentMetrics = {
        impressions: insights.post_impressions ?? 0,
        reach: insights.post_impressions_unique ?? 0,
        views: 0,
        likes: post.likes?.summary?.total_count ?? 0,
        comments: post.comments?.summary?.total_count ?? 0,
        shares: post.shares?.count ?? 0,
        saves: 0,
      };
      content.push({
        externalId: post.id,
        contentType: 'POST',
        caption: post.message ?? '',
        permalink: post.permalink_url,
        publishedAt: post.created_time ? new Date(post.created_time) : new Date(),
        isStory: false,
        metrics,
      });
    }
    return content;
  }

  private async fetchInstagramComments(account: ProviderAccountRef): Promise<ProviderComment[]> {
    const { data = [] } = await this.graphRequest<{ data: IgMedia[] }>(
      `/${account.externalId}/media`,
      { access_token: account.tokens.accessToken, fields: 'id', limit: '10' },
    );

    const comments: ProviderComment[] = [];
    for (const media of data) {
      const result = await this.safeRequest<{ data: IgComment[] }>(`/${media.id}/comments`, {
        access_token: account.tokens.accessToken,
        fields: 'id,text,username,timestamp',
        limit: '25',
      });
      for (const comment of result?.data ?? []) {
        comments.push({
          externalId: comment.id,
          author: comment.username ?? 'unknown',
          message: comment.text ?? '',
          receivedAt: comment.timestamp ? new Date(comment.timestamp) : new Date(),
          contentExternalId: media.id,
        });
      }
    }
    return comments;
  }

  private async fetchFacebookComments(account: ProviderAccountRef): Promise<ProviderComment[]> {
    const { data = [] } = await this.graphRequest<{ data: FbPost[] }>(
      `/${account.externalId}/published_posts`,
      { access_token: account.tokens.accessToken, fields: 'id', limit: '10' },
    );

    const comments: ProviderComment[] = [];
    for (const post of data) {
      const result = await this.safeRequest<{ data: FbComment[] }>(`/${post.id}/comments`, {
        access_token: account.tokens.accessToken,
        fields: 'id,message,from,created_time',
        limit: '25',
      });
      for (const comment of result?.data ?? []) {
        comments.push({
          externalId: comment.id,
          author: comment.from?.name ?? 'unknown',
          message: comment.message ?? '',
          receivedAt: comment.created_time ? new Date(comment.created_time) : new Date(),
          contentExternalId: post.id,
        });
      }
    }
    return comments;
  }

  /** Fetches insights for one media/post, tolerating per-item errors. */
  private async safeInsights(
    objectId: string,
    metrics: string[],
    accessToken: string,
  ): Promise<Record<string, number>> {
    const result = await this.safeRequest<InsightsResponse>(`/${objectId}/insights`, {
      access_token: accessToken,
      metric: metrics.join(','),
    });
    const values: Record<string, number> = {};
    for (const entry of result?.data ?? []) {
      values[entry.name] = entry.values?.[0]?.value ?? 0;
    }
    return values;
  }

  /** GET that returns null instead of throwing, for non-critical sub-requests. */
  private async safeRequest<T>(path: string, params: Record<string, string>): Promise<T | null> {
    try {
      return await this.graphRequest<T>(path, params);
    } catch {
      return null;
    }
  }
}
