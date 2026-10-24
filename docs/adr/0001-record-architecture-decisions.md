# 0001. Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-10-23

## Context

FitScape is a learning project that will grow over many sprints. Months from now we will not remember why a library, schema, or security trade-off was chosen, and code alone doesn't explain *why*.

## Decision

Record significant decisions as numbered Markdown ADRs in `docs/adr/`, using: Context → Decision → Alternatives considered → Consequences. Accepted ADRs are not edited. A new ADR supersedes an old one.

## Alternatives considered

- **Notes in PR descriptions only:** hard to find later, and scattered across many PRs.
- **A single design doc:** tends to get rewritten, losing the history of how we got here.

## Consequences

- A small overhead per significant decision.
- New contributors (and future us) can read the decision history in order.
