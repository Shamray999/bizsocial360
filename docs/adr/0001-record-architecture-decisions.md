# ADR-0001: Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-06-11
- **Deciders:** Project owner

## Context

BizSocial360 is a learning-focused project where understanding _why_ a choice was
made matters as much as the choice itself. Decisions made early (database, auth,
API style, AI integration boundary) have long-lived consequences and are easy to
forget or second-guess later.

## Decision

We will record every significant architectural decision as a numbered Markdown
file in `docs/adr/`, using the lightweight format in `template.md`. ADRs are
immutable once accepted; a change of direction is captured by a new ADR that
supersedes the old one.

## Consequences

- New contributors (and future me) can understand the reasoning behind the system.
- Decisions are reviewable in pull requests alongside the code that implements them.
- A small, ongoing documentation cost per decision — accepted deliberately as a
  core learning goal of this project.

## Alternatives considered

- **A wiki / external doc tool** — drifts from the code and is rarely updated.
- **No formal record** — fastest short-term, but loses the learning value entirely.
