import type { FastifyInstance, FastifyReply } from 'fastify';
import type { AuthSession, AuthUser } from '@bizsocial360/shared';
import type { SessionClaims } from '../plugins/auth.js';
import { isAuthConfigured } from '../plugins/auth.js';
import {
  AuthValidationError,
  DatabaseNotConfiguredError,
  InvalidCredentialsError,
  authenticateUser,
  getAuthUserById,
  registerUser,
} from '../services/auth.service.js';

interface RegisterBody {
  email: string;
  password: string;
  displayName: string;
  organizationName?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

function claimsFor(user: AuthUser): SessionClaims {
  return {
    sub: user.id,
    email: user.email,
    organizationId: user.organizationId,
    role: user.role,
  };
}

/**
 * App-auth routes (ADR-0004): human sign-in, separate from provider OAuth.
 * Issues a signed session JWT the web client sends as a Bearer token.
 */
export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: RegisterBody }>(
    '/auth/register',
    {
      schema: {
        tags: ['auth'],
        summary: 'Create an account and start a session',
        body: {
          type: 'object',
          required: ['email', 'password', 'displayName'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            displayName: { type: 'string', minLength: 1 },
            organizationName: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!isAuthConfigured()) {
        return reply.code(503).send({ error: 'Authentication is not configured (set JWT_SECRET).' });
      }
      try {
        const user = await registerUser(request.body);
        const token = await reply.jwtSign(claimsFor(user));
        const session: AuthSession = { token, user };
        return reply.code(201).send({ data: session });
      } catch (error) {
        return handleAuthError(reply, error);
      }
    },
  );

  app.post<{ Body: LoginBody }>(
    '/auth/login',
    {
      schema: {
        tags: ['auth'],
        summary: 'Sign in and start a session',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!isAuthConfigured()) {
        return reply.code(503).send({ error: 'Authentication is not configured (set JWT_SECRET).' });
      }
      try {
        const user = await authenticateUser(request.body);
        const token = await reply.jwtSign(claimsFor(user));
        const session: AuthSession = { token, user };
        return { data: session };
      } catch (error) {
        return handleAuthError(reply, error);
      }
    },
  );

  app.get(
    '/auth/me',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Return the currently authenticated user',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const user = await getAuthUserById(request.user.sub);
      if (!user) {
        return reply.code(404).send({ error: 'User not found.' });
      }
      return { data: user };
    },
  );
}

function handleAuthError(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof InvalidCredentialsError) {
    return reply.code(401).send({ error: error.message });
  }
  if (error instanceof AuthValidationError) {
    return reply.code(400).send({ error: error.message });
  }
  if (error instanceof DatabaseNotConfiguredError) {
    return reply.code(503).send({ error: error.message });
  }
  const message = error instanceof Error ? error.message : 'Unexpected error.';
  return reply.code(500).send({ error: message });
}
