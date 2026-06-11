# ADR-0003: Azure Database for PostgreSQL

- **Status:** Accepted
- **Date:** 2026-06-11
- **Deciders:** Project owner

## Context

The project requires a database that is **supported and well-operated on Azure**,
the chosen cloud. We store relational, highly connected data: organizations,
users, social accounts, posts/stories, time-series metrics, comments, and
recommendations. We also want a typed data-access layer for learning value and
safety.

## Decision

We will use **Azure Database for PostgreSQL — Flexible Server** as the primary
datastore, accessed through **Prisma ORM**.

- Connections require SSL (`sslmode=require`) per Azure managed-Postgres defaults.
- The schema lives in `apps/api/prisma/schema.prisma`.
- Migrations are applied with `prisma migrate deploy` in CI/CD.

## Consequences

- First-class Azure support: managed backups, high availability, point-in-time
  restore, and VNet integration.
- Prisma gives end-to-end type safety from schema to query, reinforcing the
  learning goals.
- PostgreSQL features we rely on (e.g. array columns, `JSON`) are fully supported.
- Local development uses PostgreSQL in Docker for parity with production.

## Alternatives considered

- **Azure SQL (SQL Server)** — excellent Azure support, but the team has no
  SQL Server expertise and PostgreSQL is the better fit for the relational +
  JSON workload. Retained as a fallback if organisational constraints demand it.
- **Azure Cosmos DB** — powerful for global scale, but document modelling fits
  this connected relational data poorly and adds cost/complexity.
- **SQLite** — great for local prototyping, not a production option on Azure.
