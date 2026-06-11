import type { Platform } from '@bizsocial360/shared';
import { env } from '../config/env.js';
import { MetaAdapter } from './meta-adapter.js';
import { TikTokAdapter } from './tiktok-adapter.js';
import { ProviderNotConfiguredError, type SocialProviderAdapter } from './types.js';

/** One adapter instance per platform. Meta serves both Facebook and Instagram. */
const adapters: Record<Platform, SocialProviderAdapter> = {
  FACEBOOK: new MetaAdapter('FACEBOOK'),
  INSTAGRAM: new MetaAdapter('INSTAGRAM'),
  TIKTOK: new TikTokAdapter(),
};

export function getProviderAdapter(platform: Platform): SocialProviderAdapter {
  return adapters[platform];
}

/** Returns the adapter only when fully configured, otherwise throws. */
export function requireProviderAdapter(platform: Platform): SocialProviderAdapter {
  const adapter = adapters[platform];
  if (!adapter.isConfigured()) {
    throw new ProviderNotConfiguredError(platform);
  }
  return adapter;
}

/**
 * The redirect URI the provider calls back after consent. This exact value must
 * be registered in the provider's app settings (Meta / TikTok developer portal).
 */
export function providerRedirectUri(platform: Platform): string {
  return `${env.APP_BASE_URL}/connect/${platform.toLowerCase()}/callback`;
}

export * from './types.js';
