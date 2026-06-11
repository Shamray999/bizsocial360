import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Platform } from '@bizsocial360/shared';
import { env } from '../config/env.js';

/**
 * Signed, self-contained OAuth `state` parameter.
 *
 * The state is round-tripped through the provider's consent screen to defend
 * against CSRF (OWASP). It is HMAC-signed so a forged value is rejected, and it
 * carries the target platform + organization so the callback can persist the
 * connection without server-side session storage.
 */
export interface OAuthStatePayload {
  platform: Platform;
  organizationId?: string;
  /** Random value so two states are never identical. */
  nonce: string;
  /** Issued-at, epoch seconds. */
  iat: number;
}

function getSecret(): string {
  const secret = env.OAUTH_STATE_SECRET ?? env.TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      'OAUTH_STATE_SECRET (or TOKEN_ENCRYPTION_KEY) must be set to sign OAuth state.',
    );
  }
  return secret;
}

function sign(data: string): string {
  return createHmac('sha256', getSecret()).update(data).digest('base64url');
}

/** Builds a signed state string for the start of an OAuth flow. */
export function createOAuthState(input: { platform: Platform; organizationId?: string }): string {
  const payload: OAuthStatePayload = {
    platform: input.platform,
    organizationId: input.organizationId,
    nonce: randomBytes(16).toString('base64url'),
    iat: Math.floor(Date.now() / 1000),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

/** Verifies a state string's signature and freshness, returning its payload. */
export function verifyOAuthState(state: string, maxAgeSeconds = 600): OAuthStatePayload {
  const [encoded, signature] = state.split('.');
  if (!encoded || !signature) {
    throw new Error('Malformed OAuth state.');
  }
  const expected = sign(encoded);
  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (signatureBuf.length !== expectedBuf.length || !timingSafeEqual(signatureBuf, expectedBuf)) {
    throw new Error('OAuth state signature mismatch.');
  }
  const payload = JSON.parse(
    Buffer.from(encoded, 'base64url').toString('utf8'),
  ) as OAuthStatePayload;
  if (Math.floor(Date.now() / 1000) - payload.iat > maxAgeSeconds) {
    throw new Error('OAuth state has expired.');
  }
  return payload;
}
