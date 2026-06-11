import bcrypt from 'bcryptjs';
import type { AuthUser, MemberRole } from '@bizsocial360/shared';
import { isDatabaseConfigured, prisma } from '../db/client.js';

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

/** Raised when auth is attempted without a database configured. */
export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super('No database is configured. Set DATABASE_URL to enable authentication.');
    this.name = 'DatabaseNotConfiguredError';
  }
}

/** Raised for invalid input (e.g. weak password, duplicate email). */
export class AuthValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthValidationError';
  }
}

/** Raised when credentials do not match a user. */
export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password.');
    this.name = 'InvalidCredentialsError';
  }
}

function assertDatabase(): void {
  if (!isDatabaseConfigured) {
    throw new DatabaseNotConfiguredError();
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Registers a new user. The first user of a brand-new account also creates an
 * organization and becomes its OWNER; subsequent registrations join as VIEWER
 * of the default organization until invitations exist.
 */
export async function registerUser(input: {
  email: string;
  password: string;
  displayName: string;
  organizationName?: string;
}): Promise<AuthUser> {
  assertDatabase();

  const email = normalizeEmail(input.email);
  if (!email.includes('@')) {
    throw new AuthValidationError('A valid email is required.');
  }
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    throw new AuthValidationError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AuthValidationError('An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  // First-ever user owns a new org; otherwise attach to the default org.
  const firstOrg = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
  const role: MemberRole = firstOrg ? 'VIEWER' : 'OWNER';

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName: input.displayName.trim() || email,
      memberships: {
        create: {
          role,
          organization: firstOrg
            ? { connect: { id: firstOrg.id } }
            : { create: { name: input.organizationName?.trim() || 'My Organization' } },
        },
      },
    },
    include: { memberships: { include: { organization: true } } },
  });

  return toAuthUser(user);
}

/** Verifies credentials and returns the user with its primary membership. */
export async function authenticateUser(input: {
  email: string;
  password: string;
}): Promise<AuthUser> {
  assertDatabase();

  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { include: { organization: true } } },
  });

  // Always run a hash comparison to reduce user-enumeration timing signals.
  const hash = user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const ok = await bcrypt.compare(input.password, hash);
  if (!user || !user.passwordHash || !ok) {
    throw new InvalidCredentialsError();
  }

  return toAuthUser(user);
}

/** Loads an AuthUser by id (used to resolve the current session). */
export async function getAuthUserById(userId: string): Promise<AuthUser | null> {
  assertDatabase();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { memberships: { include: { organization: true } } },
  });
  return user ? toAuthUser(user) : null;
}

type UserWithMemberships = {
  id: string;
  email: string;
  displayName: string;
  memberships: { role: MemberRole; organizationId: string }[];
};

function toAuthUser(user: UserWithMemberships): AuthUser {
  const membership = user.memberships[0];
  if (!membership) {
    throw new AuthValidationError('User has no organization membership.');
  }
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    organizationId: membership.organizationId,
    role: membership.role,
  };
}
