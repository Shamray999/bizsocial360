/**
 * Social platforms supported by BizSocial360.
 *
 * Facebook and Instagram ship in the first release (Meta Graph API).
 * TikTok is modelled from day one and activated once API access is approved.
 */
export const PLATFORMS = ['FACEBOOK', 'INSTAGRAM', 'TIKTOK'] as const;

export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
};

/** Platforms that are fully active in the current release. */
export const ACTIVE_PLATFORMS: readonly Platform[] = ['FACEBOOK', 'INSTAGRAM'];

/** Platforms scaffolded but gated behind a feature flag pending API approval. */
export const PREVIEW_PLATFORMS: readonly Platform[] = ['TIKTOK'];

export function isPlatform(value: unknown): value is Platform {
  return typeof value === 'string' && (PLATFORMS as readonly string[]).includes(value);
}

export function isPlatformActive(platform: Platform): boolean {
  return ACTIVE_PLATFORMS.includes(platform);
}
