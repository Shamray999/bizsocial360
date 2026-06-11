# Architecture Decision Records (ADRs)

This directory captures the significant architectural decisions for BizSocial360,
including the context, the decision made, and its consequences.

We use ADRs as a learning and communication tool: every meaningful technical
choice should be recorded so the reasoning survives beyond the moment.

## Process

1. Copy [`template.md`](./template.md) to `NNNN-short-title.md` (next number).
2. Fill in Context, Decision, Consequences, and Alternatives.
3. Open a pull request. The ADR starts as `Proposed`.
4. Once merged and adopted, set the status to `Accepted`.
5. If a later ADR overturns it, mark this one `Superseded by ADR-XXXX`.

## Status values

`Proposed` · `Accepted` · `Deprecated` · `Superseded`

## Index

| ADR                                                      | Title                              | Status   |
| -------------------------------------------------------- | ---------------------------------- | -------- |
| [0001](./0001-record-architecture-decisions.md)          | Record architecture decisions      | Accepted |
| [0002](./0002-modular-monolith-and-monorepo.md)          | Modular monolith in a monorepo     | Accepted |
| [0003](./0003-azure-database-for-postgresql.md)          | Azure Database for PostgreSQL      | Accepted |
| [0004](./0004-authentication-model.md)                   | Authentication model               | Accepted |
| [0005](./0005-public-api-and-mcp-boundary.md)            | Public API and MCP boundary        | Accepted |
