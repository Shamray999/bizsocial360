import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Application-layer encryption for provider OAuth tokens.
 *
 * ADR-0004 requires provider tokens to be encrypted at rest and never logged
 * or returned by the public API. We use AES-256-GCM (authenticated encryption)
 * so tampering is detected on decrypt.
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit nonce, recommended for GCM
const KEY_LENGTH = 32; // 256-bit key
const FORMAT_VERSION = 'v1';

let cachedKey: Buffer | null = null;

function parseKey(raw: string): Buffer {
  const isHex = /^[0-9a-fA-F]{64}$/.test(raw);
  const key = isHex ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must decode to ${KEY_LENGTH} bytes (got ${key.length}). ` +
        'Provide 64 hex characters or a base64-encoded 32-byte key.',
    );
  }
  return key;
}

function getKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }
  if (!env.TOKEN_ENCRYPTION_KEY) {
    throw new Error('TOKEN_ENCRYPTION_KEY is not configured; cannot encrypt provider tokens.');
  }
  cachedKey = parseKey(env.TOKEN_ENCRYPTION_KEY);
  return cachedKey;
}

/** True when an encryption key is configured (does not validate the key). */
export function isTokenEncryptionConfigured(): boolean {
  return Boolean(env.TOKEN_ENCRYPTION_KEY);
}

/** Encrypts a secret into a self-describing `v1.iv.tag.ciphertext` string. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    FORMAT_VERSION,
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join('.');
}

/** Reverses {@link encryptSecret}; throws if the payload was tampered with. */
export function decryptSecret(payload: string): string {
  const [version, ivB64, tagB64, ctB64] = payload.split('.');
  if (version !== FORMAT_VERSION || !ivB64 || !tagB64 || !ctB64) {
    throw new Error('Malformed encrypted secret.');
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
