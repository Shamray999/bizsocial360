import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.route.js';
import { authRoutes } from './auth.route.js';
import { connectionRoutes } from './connections.route.js';
import { syncRoutes } from './sync.route.js';
import { publicApiV1Routes } from '../public-api/v1/routes.js';

/** Registers all top-level routes for the application. */
export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(connectionRoutes);
  await app.register(syncRoutes);
  await app.register(publicApiV1Routes, { prefix: '/api/v1' });
}
