'use client';

import { useEffect, useState } from 'react';
import {
  ACTIVE_PLATFORMS,
  PLATFORM_LABELS,
  PREVIEW_PLATFORMS,
  type AuthUser,
  type Platform,
} from '@bizsocial360/shared';
import { apiFetch, clearSession, getUser } from '@/lib/auth';

/**
 * Auth-aware entry point for the provider-OAuth flow.
 *
 * Signed out: prompts the user to sign in. Signed in: shows a Connect button
 * per active platform that fetches the provider authorization URL (with the
 * session Bearer token) and navigates the browser to the provider's consent
 * screen. TikTok is shown as a disabled preview until API access is approved.
 */
export function ConnectAccounts() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pending, setPending] = useState<Platform | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setUser(getUser());
  }, []);

  async function connect(platform: Platform) {
    setError(null);
    setPending(platform);
    try {
      const { authorizationUrl } = await apiFetch<{ authorizationUrl: string }>(
        `/connect/${platform.toLowerCase()}`,
      );
      window.location.href = authorizationUrl;
    } catch (err) {
      setPending(null);
      setError(err instanceof Error ? err.message : 'Could not start the connection.');
    }
  }

  // Avoid hydration mismatch: render nothing auth-specific until mounted.
  if (!mounted) {
    return null;
  }

  if (!user) {
    return (
      <a
        href="/login"
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
      >
        Sign in to connect accounts
      </a>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        {ACTIVE_PLATFORMS.map((platform) => (
          <button
            key={platform}
            type="button"
            onClick={() => connect(platform)}
            disabled={pending !== null}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60"
          >
            <span aria-hidden>+</span>
            {pending === platform ? 'Redirecting…' : `Connect ${PLATFORM_LABELS[platform]}`}
          </button>
        ))}
        {PREVIEW_PLATFORMS.map((platform) => (
          <button
            key={platform}
            type="button"
            disabled
            title="Pending API approval"
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-400"
          >
            {PLATFORM_LABELS[platform]}
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase">
              soon
            </span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span>Signed in as {user.displayName}</span>
        <span aria-hidden>·</span>
        <button
          type="button"
          onClick={() => {
            clearSession();
            setUser(null);
          }}
          className="text-slate-500 hover:underline"
        >
          Sign out
        </button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
