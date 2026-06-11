import type { AuthSession, AuthUser } from '@bizsocial360/shared';

/**
 * Client-side session handling for the dashboard.
 *
 * The session JWT is kept in localStorage and sent as a Bearer token. This is
 * the pragmatic choice for a two-origin local setup (web :3000, API :4000); for
 * production, prefer an httpOnly cookie via a same-origin proxy to remove the
 * XSS exposure of localStorage tokens.
 */
const TOKEN_KEY = 'bs360.token';
const USER_KEY = 'bs360.user';

/** Browser-facing API base URL. */
export function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
}

export function getToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession): void {
  window.localStorage.setItem(TOKEN_KEY, session.token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

/** Wrapper around fetch that attaches the Bearer token and parses `{ data }`. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${getApiBase()}${path}`, { ...init, headers });
  const body = (await response.json().catch(() => null)) as
    | { data?: T; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(body?.error ?? `Request failed with ${response.status}`);
  }
  return (body?.data ?? (body as unknown)) as T;
}
