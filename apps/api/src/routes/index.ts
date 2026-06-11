import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.route.js';
import { publicApiV1Routes } from '../public-api/v1/routes.js';

/** Registers all top-level routes for the application. */
export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes);
  await app.register(publicApiV1Routes, { prefix: '/api/v1' });
}
