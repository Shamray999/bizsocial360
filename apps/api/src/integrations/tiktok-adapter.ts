import type { Platform } from '@bizsocial360/shared';
import { env } from '../config/env.js';
import {
  ProviderOAuthError,
  type AuthorizationUrlParams,
  type ExchangeCodeParams,
  type ProviderAccount,
  type ProviderTokens,
  type SocialProviderAdapter,
} from './types.js';

const SCOPES = ['user.info.basic', 'user.info.profile', 'user.info.stats'];
const AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/';

interface TikTokTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  open_id: string;
  scope: string;
  error?: string;
  error_description?: string;
}

interface TikTokUser {
  open_id: string;
  display_name?: string;
  username?: string;
  follower_count?: number;
}

/**
 * Adapter for TikTok Login Kit + Display API.
 *
 * Gated behind ENABLE_TIKTOK until the app's API access is approved (TikTok is
 * in the preview-platform list in packages/shared). The interface is identical
 * to the Meta adapter so activation is a config change, not a code change.
 */
export class TikTokAdapter implements SocialProviderAdapter {
  readonly platform: Platform = 'TIKTOK';

  isConfigured(): boolean {
    return env.ENABLE_TIKTOK && Boolean(env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET);
  }

  getAuthorizationUrl({ state, redirectUri }: AuthorizationUrlParams): string {
    const params = new URLSearchParams({
      client_key: env.TIKTOK_CLIENT_KEY ?? '',
      scope: SCOPES.join(','),
      response_type: 'code',
      redirect_uri: redirectUri,
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode({ code, redirectUri }: ExchangeCodeParams): Promise<ProviderTokens> {
    const body = await this.tokenRequest({
      client_key: env.TIKTOK_CLIENT_KEY ?? '',
      client_secret: env.TIKTOK_CLIENT_SECRET ?? '',
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });
    return this.toTokens(body);
  }

  async refreshTokens(refreshToken: string): Promise<ProviderTokens> {
    const body = await this.tokenRequest({
      client_key: env.TIKTOK_CLIENT_KEY ?? '',
      client_secret: env.TIKTOK_CLIENT_SECRET ?? '',
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    return this.toTokens(body);
  }

  async fetchAccounts(tokens: ProviderTokens): Promise<ProviderAccount[]> {
    const fields = 'open_id,display_name,username,follower_count';
    const response = await fetch(`${USER_INFO_URL}?fields=${encodeURIComponent(fields)}`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    const body = (await response.json()) as {
      data?: { user?: TikTokUser };
      error?: { code?: string; message?: string };
    };
    if (!response.ok || (body.error?.code && body.error.code !== 'ok')) {
      throw new ProviderOAuthError(
        body.error?.message ?? `TikTok user info error (HTTP ${response.status})`,
        this.platform,
      );
    }
    const user = body.data?.user;
    if (!user) {
      return [];
    }
    return [
      {
        platform: 'TIKTOK',
        externalId: user.open_id,
        handle: user.username ?? user.open_id,
        displayName: user.display_name ?? user.username ?? user.open_id,
        followers: user.follower_count ?? 0,
        tokens,
      },
    ];
  }

  private async tokenRequest(params: Record<string, string>): Promise<TikTokTokenResponse> {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });
    const body = (await response.json()) as TikTokTokenResponse;
    if (!response.ok || body.error) {
      throw new ProviderOAuthError(
        body.error_description ?? body.error ?? `TikTok token error (HTTP ${response.status})`,
        this.platform,
      );
    }
    return body;
  }

  private toTokens(body: TikTokTokenResponse): ProviderTokens {
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      scope: body.scope,
      expiresAt: body.expires_in ? new Date(Date.now() + body.expires_in * 1000) : undefined,
    };
  }
}
