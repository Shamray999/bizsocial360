import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import type { MemberRole } from '@bizsocial360/shared';
import { env } from '../config/env.js';

/** Claims we embed in the session token. */
export interface SessionClaims {
  sub: string;
  email: string;
  organizationId: string;
  role: MemberRole;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: SessionClaims;
    user: SessionClaims;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    /** Pre-handler that rejects unauthenticated requests with 401. */
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/** True when a JWT signing secret is configured. */
export function isAuthConfigured(): boolean {
  return Boolean(env.JWT_SECRET);
}

/**
 * Registers JWT support and an `authenticate` pre-handler.
 *
 * App auth is intentionally separate from provider OAuth (ADR-0004): this guard
 * protects human-facing endpoints; provider tokens are handled elsewhere.
 */
export async function registerAuth(app: FastifyInstance): Promise<void> {
  // A development-only fallback secret keeps the app bootable without config,
  // but tokens are only issued/accepted when JWT_SECRET is explicitly set.
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET ?? 'dev-insecure-secret-change-me',
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!isAuthConfigured()) {
      await reply.code(503).send({ error: 'Authentication is not configured (set JWT_SECRET).' });
      return;
    }
    try {
      await request.jwtVerify();
    } catch {
      await reply.code(401).send({ error: 'Authentication required.' });
    }
  });
}
