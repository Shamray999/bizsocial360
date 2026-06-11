import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

/**
 * Singleton Prisma client. In development we cache it on `globalThis`
 * to avoid exhausting connections during hot reloads.
 *
 * Note: the client is lazy — it does not open a connection until the
 * first query, so the API can boot for health checks before the Azure
 * database is provisioned.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/** True when a database connection string has been configured. */
export const isDatabaseConfigured = Boolean(env.DATABASE_URL);
