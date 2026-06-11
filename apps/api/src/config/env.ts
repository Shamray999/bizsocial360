import 'dotenv/config';
import { z } from 'zod';

/**
 * Validates and exposes typed environment configuration.
 * The app boots without DATABASE_URL so health checks work before the
 * Azure database is provisioned; data routes guard for its presence.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().url().optional(),

  // Public base URL of this API. Used to build provider OAuth redirect URIs;
  // the value must match what is registered in each provider's app settings.
  APP_BASE_URL: z.string().url().default('http://localhost:4000'),

  // App-layer encryption key for provider tokens at rest (AES-256-GCM).
  // Provide 64 hex chars or a base64-encoded 32-byte key. Required before any
  // social account can be connected. Generate with: openssl rand -hex 32
  TOKEN_ENCRYPTION_KEY: z.string().optional(),
  // HMAC secret used to sign the OAuth `state` parameter (CSRF protection).
  // Falls back to TOKEN_ENCRYPTION_KEY when unset.
  OAUTH_STATE_SECRET: z.string().optional(),

  // Secret used to sign app-auth session JWTs. Required to issue/verify logins.
  // Generate with: openssl rand -hex 32
  JWT_SECRET: z.string().optional(),
  // Lifetime of an issued session token (vercel/ms format, e.g. 15m, 7d).
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Meta app credentials (one app serves both Facebook and Instagram).
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_GRAPH_VERSION: z.string().default('v21.0'),

  // TikTok app credentials. Also requires ENABLE_TIKTOK=true to activate.
  TIKTOK_CLIENT_KEY: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),

  ENABLE_TIKTOK: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;

export const corsOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
