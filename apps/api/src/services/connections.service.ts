import type { Platform, SocialAccountSummary } from '@bizsocial360/shared';
import { isDatabaseConfigured, prisma } from '../db/client.js';
import { providerRedirectUri, requireProviderAdapter } from '../integrations/index.js';
import type { ProviderAccount } from '../integrations/types.js';
import { createOAuthState, verifyOAuthState } from '../security/oauth-state.js';
import { encryptSecret } from '../security/token-crypto.js';

/** Raised when account connection is attempted without a database configured. */
export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super('No database is configured. Set DATABASE_URL to connect social accounts.');
    this.name = 'DatabaseNotConfiguredError';
  }
}

/** Raised when an account is not found within the caller's organization. */
export class AccountNotFoundError extends Error {
  constructor() {
    super('Social account not found.');
    this.name = 'AccountNotFoundError';
  }
}

export interface ConnectionResult {
  platform: Platform;
  connected: SocialAccountSummary[];
}

function assertDatabase(): void {
  if (!isDatabaseConfigured) {
    throw new DatabaseNotConfiguredError();
  }
}

/**
 * Resolves the organization a connected account belongs to.
 *
 * App auth is not wired yet (ADR-0004), so we accept an explicit id and fall
 * back to a single default development organization. Replace this with the
 * authenticated session's organization once app auth lands.
 */
async function resolveOrganizationId(provided?: string): Promise<string> {
  if (provided) {
    return provided;
  }
  const existing = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
  if (existing) {
    return existing.id;
  }
  const created = await prisma.organization.create({ data: { name: 'My Organization' } });
  return created.id;
}

/** Step 1 — build the provider authorization URL the user is redirected to. */
export function buildAuthorizationUrl(input: {
  platform: Platform;
  organizationId?: string;
}): string {
  const adapter = requireProviderAdapter(input.platform);
  const state = createOAuthState({
    platform: input.platform,
    organizationId: input.organizationId,
  });
  return adapter.getAuthorizationUrl({
    state,
    redirectUri: providerRedirectUri(input.platform),
  });
}

/**
 * Step 2 — handle the provider callback: verify state, exchange the code, and
 * persist each discovered account with its token encrypted at rest.
 */
export async function handleOAuthCallback(input: {
  platform: Platform;
  code: string;
  state: string;
}): Promise<ConnectionResult> {
  assertDatabase();

  const payload = verifyOAuthState(input.state);
  if (payload.platform !== input.platform) {
    throw new Error('OAuth state platform mismatch.');
  }

  const adapter = requireProviderAdapter(input.platform);
  const organizationId = await resolveOrganizationId(payload.organizationId);

  const userTokens = await adapter.exchangeCode({
    code: input.code,
    redirectUri: providerRedirectUri(input.platform),
  });
  const accounts = await adapter.fetchAccounts(userTokens);

  const connected: SocialAccountSummary[] = [];
  for (const account of accounts) {
    connected.push(await persistAccount(organizationId, account));
  }
  return { platform: input.platform, connected };
}

async function persistAccount(
  organizationId: string,
  account: ProviderAccount,
): Promise<SocialAccountSummary> {
  const tokenData = {
    accessToken: encryptSecret(account.tokens.accessToken),
    refreshToken: account.tokens.refreshToken
      ? encryptSecret(account.tokens.refreshToken)
      : null,
    scope: account.tokens.scope ?? null,
    expiresAt: account.tokens.expiresAt ?? null,
  };

  const saved = await prisma.socialAccount.upsert({
    where: {
      platform_externalId: { platform: account.platform, externalId: account.externalId },
    },
    create: {
      platform: account.platform,
      externalId: account.externalId,
      handle: account.handle,
      displayName: account.displayName,
      followers: account.followers,
      connected: true,
      organizationId,
      oauthToken: { create: tokenData },
    },
    update: {
      handle: account.handle,
      displayName: account.displayName,
      followers: account.followers,
      connected: true,
      oauthToken: { upsert: { create: tokenData, update: tokenData } },
    },
  });

  return toSummary(saved);
}

/** Lists connected accounts for an organization. Never returns tokens. */
export async function listConnections(organizationId?: string): Promise<SocialAccountSummary[]> {
  assertDatabase();
  const accounts = await prisma.socialAccount.findMany({
    where: organizationId ? { organizationId } : undefined,
    orderBy: { createdAt: 'asc' },
  });
  return accounts.map(toSummary);
}

/** Disconnects an account: deletes its stored token and marks it disconnected. */
export async function disconnectAccount(
  accountId: string,
  organizationId: string,
): Promise<void> {
  assertDatabase();
  // Scope to the caller's organization so one org cannot disconnect another's.
  const account = await prisma.socialAccount.findFirst({
    where: { id: accountId, organizationId },
    select: { id: true },
  });
  if (!account) {
    throw new AccountNotFoundError();
  }
  await prisma.oAuthToken.deleteMany({ where: { accountId } });
  await prisma.socialAccount.update({ where: { id: accountId }, data: { connected: false } });
}

function toSummary(account: {
  id: string;
  platform: Platform;
  handle: string;
  displayName: string;
  followers: number;
  connected: boolean;
}): SocialAccountSummary {
  return {
    id: account.id,
    platform: account.platform,
    handle: account.handle,
    displayName: account.displayName,
    followers: account.followers,
    connected: account.connected,
  };
}
