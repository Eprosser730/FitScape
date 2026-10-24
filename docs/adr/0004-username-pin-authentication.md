# 0004. Username + PIN authentication

- **Status:** Accepted
- **Date:** 2026-10-23

## Context

Sign-in should be quick and friendly for family and friends: a **username and a 4-digit PIN**, with sign-up requiring only first name, last name, username, and PIN. If a username isn't recognized at sign-in, the page should offer to create that account.

A 4-digit PIN has only 10,000 possible values, so the design has to compensate.

## Decision

- **Validation:**
  - username: 3–20 characters (lowercase letters, digits, underscore), case-insensitive, stored lowercase
  - names: 1–50 characters, trimmed
  - PIN: exactly 4 digits, rejecting a small denylist of obvious PINs (such as 0000, 1234, 1111)
- **PIN storage:** the PIN is combined with a server-side secret **pepper** (HMAC-SHA256, from the environment) and then hashed with **argon2id**. The plain PIN is never stored or logged.
- **Lockout:** after **5** consecutive wrong PINs, the account is locked for **15 minutes**. A successful sign-in resets the counter.
- **Sessions:** on sign-in, the server creates a random 32-byte token. The database stores only its SHA-256 hash, plus an expiry (30 days). The browser holds the token in a cookie `fitscape_session` that is `HttpOnly`, `SameSite=Strict`, and `Secure` when served over HTTPS.
- **CSRF:** state-changing endpoints accept JSON only. Combined with `SameSite=Strict`, cross-site form posts can't ride the session.
- **Unknown username:** `POST /api/auth/login` returns `404 user_not_found`, and the UI switches to an inline sign-up form with the username pre-filled.

## Alternatives considered

- **Passwords:** stronger, but more friction than wanted for this audience.
- **JWTs in localStorage:** readable by any script on the page (XSS risk) and hard to revoke. Server-side sessions are simpler and revocable.
- **Generic "invalid username or PIN" errors:** hides which usernames exist, but contradicts the desired "offer to sign up" flow.

## Consequences (accepted trade-offs)

- **Username enumeration:** anyone who can reach the app can learn whether a username exists. Acceptable because the app is reachable only via a private Tailscale network.
- **Lockout as a nuisance:** someone could deliberately lock another user out for 15 minutes. Acceptable at this scale. Revisit if the audience grows.
- **Offline cracking:** a 4-digit argon2 hash alone can be brute-forced quickly. The pepper means a stolen database dump is useless without the server's secret, so the pepper must be kept out of the database and out of git.
- If FitScape is ever exposed beyond the tailnet, revisit this ADR (longer PINs or passwords, per-IP rate limiting, HTTPS required).
