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
