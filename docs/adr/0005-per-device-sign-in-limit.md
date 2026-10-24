# 0005. Per-device limit on failed sign-ins

- **Status:** Accepted
- **Date:** 2026-10-24
- **Amends:** [0004](0004-username-pin-authentication.md)

## Context

ADR 0004 locks an **account** for 15 minutes after 5 wrong PINs. Once guests join the tailnet (#5), one guest could still try PINs against account after account, locking each one out in turn. Raised by the security review on #36 (issue #41).

## Decision

- `POST /api/auth/login` counts **wrong PINs per client IP**. Unknown usernames don't count (they reveal nothing about any PIN, and ADR 0004 already accepts that usernames are discoverable), nor do successful sign-ins or replies for already-locked accounts.
- After **10 failures in 15 minutes**, that client gets `429 too_many_attempts` with `retry_after` seconds (and a `Retry-After` header) for any username, until its oldest failure ages out.
- **Which IP:** `tailscale serve` appends the visitor's tailnet IP to `X-Forwarded-For`. nginx trusts that header only from Docker/localhost hops (`real_ip_*`), then always overwrites `X-Real-IP` with the result. The API reads `X-Real-IP`, falling back to the connection address. The api container isn't published, so only nginx can set that header.
- The counts live **in memory** in the single API process.

## Alternatives considered

- **Key on the Tailscale identity** (`Tailscale-User-Login` header): ties guesses to a person, but shared-in users and future non-Tailscale access would need a second path. The IP works for both.
- **Store counts in Postgres:** survives restarts and multiple workers; more code for one worker and a small tailnet.

## Consequences

- An API restart (every deploy) forgets the counts. Acceptable: the per-account lockout is stored and still applies.
- Several people behind one IP share a budget. On a tailnet every device has its own IP, so this doesn't arise today.
- Running more than one API worker would split the counts per worker; move them to Postgres first.
