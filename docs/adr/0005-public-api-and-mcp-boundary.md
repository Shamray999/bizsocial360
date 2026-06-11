# ADR-0005: Public API and MCP boundary

- **Status:** Accepted
- **Date:** 2026-06-11
- **Deciders:** Project owner

## Context

BizSocial360 exposes its data in two ways beyond the web client:

1. A **public REST API** for external/programmatic consumers.
2. An **MCP server** so AI agents can query insights as tools.

Both must stay decoupled from internal domain logic so that internal refactors do
not break external contracts or AI integrations.

## Decision

We will treat the public API and MCP as **thin adapters over a shared service
layer**, not as direct database access:

- Internal **services** own all business logic and data access (Prisma).
- The **public API** (`apps/api/src/public-api`) is versioned (`/api/v1`) and its
  contract is described by the generated OpenAPI spec (Swagger UI at `/docs`).
- The **MCP server** (`apps/api/src/mcp`) exposes a small set of read-only tools
  (`get_engagement_summary`, `list_pending_comments`,
  `get_publish_recommendations`) that call the same services.
- AI features build on top of the verified service/data layer — never on
  unvalidated raw provider payloads.

## Consequences

- One source of truth for business logic; REST and MCP cannot drift apart.
- Versioning + OpenAPI enables contract tests and safe evolution.
- A clear, auditable surface for what AI agents can see and do.
- A little extra indirection (routes/tools delegate to services) — accepted for
  the decoupling it buys.

## Alternatives considered

- **Let routes/tools query the database directly** — fastest to write, but
  duplicates logic and couples external contracts to the schema.
- **Expose the full internal API to AI agents** — broadens the attack/risk
  surface; a curated tool set is safer and clearer.
