# ADR-0002: Modular monolith in a monorepo

- **Status:** Accepted
- **Date:** 2026-06-11
- **Deciders:** Project owner

## Context

The system needs a web client, a backend API, a public API, an MCP server,
background ingestion jobs, and shared types. We must balance learning breadth
against the risk of drowning in distributed-systems complexity (service
discovery, network failures, deploy orchestration) before any feature ships.

## Decision

We will build a **modular monolith** organised as a **monorepo** using npm
workspaces:

- `apps/web` — Next.js client.
- `apps/api` — Fastify backend hosting REST routes, the public API, ingestion
  jobs, and the MCP server, each in its own module with clear boundaries.
- `packages/shared` — types and DTO contracts shared across apps.
- `infra/` — infrastructure-as-code and local dev tooling.

Modules communicate through in-process interfaces (e.g. a `SocialProviderAdapter`
abstraction), so a module such as the MCP server or ingestion worker can later be
extracted into its own deployable service with minimal churn.

## Consequences

- One repository, one install, one CI pipeline — fast local iteration.
- Clear seams make a future split into services low-risk.
- A single deploy unit initially; scaling individual concerns independently is
  deferred until there is a real need.

## Alternatives considered

- **Microservices from day one** — too much operational overhead for a solo
  learning project; premature for the current scale.
- **Separate repos per app (polyrepo)** — complicates shared types and
  cross-cutting changes.
