import type { Platform } from '@bizsocial360/shared';

/** Normalized OAuth tokens returned by a provider, ready to encrypt + store. */
export interface ProviderTokens {
  accessToken: string;
  refreshToken?: string;
  scope?: string;
  expiresAt?: Date;
}
/**
 * A connectable account discovered after the OAuth flow, normalized across
 * providers. `tokens` may be a per-account token (e.g. a Meta Page token) that
 * differs from the user-level token used during the exchange.
 */
export interface ProviderAccount {
  platform: Platform;
  externalId: string;
  handle: string;
  displayName: string;
  followers: number;
  tokens: ProviderTokens;
}

export interface AuthorizationUrlParams {
  state: string;
  redirectUri: string;
}

export interface ExchangeCodeParams {
  code: string;
  redirectUri: string;
}

/** Identifies a connected account when pulling its content/comments. */
export interface ProviderAccountRef {
  externalId: string;
  tokens: ProviderTokens;
}

/** Normalized engagement counters for a single piece of content. */
export interface ProviderContentMetrics {
  impressions: number;
  reach: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

/** A normalized piece of content pulled from a provider. */
export interface ProviderContent {
  externalId: string;
  contentType: 'POST' | 'STORY' | 'REEL' | 'VIDEO';
  caption: string;
  permalink?: string;
  publishedAt: Date;
  /** True for ephemeral stories (persisted to the Story table). */
  isStory: boolean;
  expiresAt?: Date;
  metrics: ProviderContentMetrics;
}

/** A normalized customer comment pulled from a provider. */
export interface ProviderComment {
  externalId: string;
  author: string;
  message: string;
  receivedAt: Date;
  /** External id of the content the comment belongs to, when known. */
  contentExternalId?: string;
}

/**
 * Normalizes a single social platform's OAuth flow and account discovery.
 * Routes and services depend only on this interface, so adding a platform never
 * touches the connection orchestration (see the connector pattern in the plan).
 */
export interface SocialProviderAdapter {
  readonly platform: Platform;
  /** True when this provider has the credentials it needs to run the flow. */
  isConfigured(): boolean;
  /** Builds the URL the user is redirected to for consent. */
  getAuthorizationUrl(params: AuthorizationUrlParams): string;
  /** Exchanges the authorization code for durable tokens. */
  exchangeCode(params: ExchangeCodeParams): Promise<ProviderTokens>;
  /** Discovers the connectable accounts the granted token has access to. */
  fetchAccounts(tokens: ProviderTokens): Promise<ProviderAccount[]>;
  /** Optional: renews tokens before expiry where the provider supports it. */
  refreshTokens?(refreshToken: string): Promise<ProviderTokens>;
  /** Optional: pulls recent posts/stories with their latest metrics. */
  fetchContent?(account: ProviderAccountRef): Promise<ProviderContent[]>;
  /** Optional: pulls recent customer comments awaiting a response. */
  fetchComments?(account: ProviderAccountRef): Promise<ProviderComment[]>;
}

/** Raised when a platform's OAuth credentials are missing. */
export class ProviderNotConfiguredError extends Error {
  constructor(public readonly platform: Platform) {
    super(
      `Provider ${platform} is not configured. Set its OAuth credentials in the environment.`,
    );
    this.name = 'ProviderNotConfiguredError';
  }
}

/** Raised when a provider rejects a request during the OAuth flow. */
export class ProviderOAuthError extends Error {
  constructor(
    message: string,
    public readonly platform: Platform,
  ) {
    super(message);
    this.name = 'ProviderOAuthError';
  }
}
