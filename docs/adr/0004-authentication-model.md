# ADR-0004: Authentication model

- **Status:** Accepted
- **Date:** 2026-06-11
- **Deciders:** Project owner

## Context

There are two distinct authentication concerns that are easy to conflate:

1. **App authentication** — how a human signs in to BizSocial360.
2. **Provider authentication** — how the app obtains delegated access to a
   business's Facebook, Instagram, and (later) TikTok data via OAuth 2.0.

Conflating them leads to tangled token handling and security risk.

## Decision

We will keep the two concerns in **separate bounded contexts**:

- **App auth**: users belong to organizations via `Membership` records with
  roles (`OWNER`, `ADMIN`, `ANALYST`, `VIEWER`). Sessions authorize requests.
- **Provider auth**: each connected `SocialAccount` has an `OAuthToken`
  (access token, refresh token, scope, expiry). Tokens are **encrypted at rest**
  at the application layer and are never logged or returned by the public API.
- A refresh routine renews provider tokens before expiry; expiry events raise
  operational alerts.

For app auth we will start with an authentication provider (e.g. Auth0/Clerk) or
a vetted library rather than hand-rolling password storage, and revisit if needs
change.

## Consequences

- Clear separation limits the blast radius of a token leak and simplifies
  reasoning about each flow.
- Role-based membership supports multi-user organizations from the start.
- Encryption-at-rest and rotation add implementation work, accepted as required
  security baseline.

## Alternatives considered

- **One combined identity for app + providers** — simpler initially, but mixes
  concerns and complicates least-privilege handling of provider tokens.
- **Hand-rolled auth from day one** — high security risk and low learning ROI
  compared with integrating a proven provider first.
