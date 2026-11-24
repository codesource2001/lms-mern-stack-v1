# ADR-0002 — Authentication token and session strategy

- **Status:** Accepted (implementation begins in Phase 3)
- **Date:** 24 November 2026
- **Deciders:** Project maintainer
- **Supersedes:** None

## Context

Atrium needs authentication for four roles (Super Admin, Admin, Instructor, Student) across a browser SPA and an HTTP API. The strategy must:

- Resist token theft and replay.
- Support immediate revocation (suspend user, logout all devices, password change).
- Avoid exposing long-lived credentials to JavaScript.
- Work with a separately deployed SPA and API, including cross-site development origins.
- Support CSRF defense without making every API call stateful.
- Be implementable and testable by a small team.

Common shortcuts have known failure modes: JWTs in `localStorage` are exfiltrated by any XSS; long-lived JWTs cannot be revoked promptly; cookie-only access tokens expand the CSRF surface to every endpoint; refresh tokens stored in plaintext turn a database read into account takeover.

## Decision

Use a **short-lived access JWT plus a rotating opaque refresh token in an HTTP-only cookie**, backed by a server-side session record.

### Access token

- JWT signed with a strong asymmetric or high-entropy symmetric secret from configuration.
- Lifetime: approximately **15 minutes** (exact value configured).
- Delivered in the response body and held **in memory only** by the SPA. Never written to `localStorage`, `sessionStorage`, IndexedDB, or a non-HttpOnly cookie.
- Sent as `Authorization: Bearer <token>`.
- Contains minimal claims: subject (user ID), session ID, role/permission version, issued-at, expiry. Authorization decisions that must be instantaneous still consult server state or a version counter.
- Verified on every protected request; expiry and signature failures return `401` with a stable code.

### Refresh token

- **Opaque**, cryptographically random (at least 256 bits), not a JWT.
- Delivered in a cookie with `HttpOnly`, `Secure` in production, `SameSite=Lax`, and `Path` scoped to the refresh endpoint. `Domain` is left unset.
- Stored server-side only as a **SHA-256 hash**, alongside session metadata: user ID, token family ID, issued-at, expiry, last-used, user-agent hash, IP hash, revocation state.
- Lifetime: approximately **7–30 days** with absolute and idle expiry (value configured). Rotation on every successful refresh: the old token is marked used and a new token is issued in the same family.
- **Reuse detection:** presenting an already-rotated token revokes the entire token family, invalidates the session, and writes an audit log entry. The response is a generic `401`; no detail about which token was reused is returned.
- Logout revokes the current session. Logout-all revokes every session for the user. Password change and account suspension revoke all sessions.

### Session model

A `Session` (or `RefreshToken`) collection is the revocation source of truth. Redis may cache session validity for speed, but MongoDB remains authoritative and Redis loss must not resurrect revoked sessions.

### CSRF

Because the refresh cookie is `SameSite=Lax` and scoped to the refresh path, cross-site POSTs do not carry it in modern browsers. As defense in depth, cookie-authenticated mutations (refresh, logout) validate `Origin`/`Referer` against the configured allowlist. Access-token-authenticated requests are not cookie-authenticated and are not CSRF-eligible.

### Bootstrapping and multi-tab behavior

- On app load, the SPA calls the refresh endpoint once to obtain an access token; a failed refresh means unauthenticated.
- Concurrent refreshes from multiple tabs should be coordinated (for example a broadcast channel or a short-lived lock) to avoid tripping reuse detection. The server must tolerate a narrow race by treating a token used within a small grace window as idempotent, or the client must serialize refreshes. The chosen behavior must be tested for both success and reuse.
- Access-token expiry triggers one refresh-and-retry; a failed refresh clears local auth state and routes to login.

### Password and account protections

- **Argon2id** with tuned memory, iterations, and parallelism; parameters recorded and reviewed as hardware changes.
- Email verification before login where the product requires it.
- Password reset and email verification tokens are single-use, hashed at rest, expiring, and invalidated on use.
- Login throttling and progressive lockout keyed by account and IP, stricter than global limits. Failure messages do not reveal whether an email exists.
- Audit logs for login, logout, refresh-token reuse, password change, email change, role change, and administrative suspension.

## Consequences

**Positive**

- XSS cannot read the refresh token; the access token has a short window and lives only in memory.
- Revocation is immediate and server-controlled.
- Refresh-token database compromise does not yield usable raw tokens.
- Access-token verification is fast for normal API traffic.
- Reuse detection turns silent token theft into a detectable, contained event.

**Negative / costs**

- The SPA needs a refresh-on-load flow and careful multi-tab coordination.
- Two token types and a session store add implementation and test surface.
- Asymmetric signing adds key management; symmetric signing requires a strong shared secret and rotation plan.
- In-memory access tokens are lost on reload by design, requiring a refresh round trip.
- A stolen access token is usable until expiry (bounded to minutes).
- Cookie behavior differs across environments; production requires HTTPS and correct origin configuration.

**Mitigations**

- Keep access-token lifetime short and configurable.
- Test reuse detection, revocation, expiry, and multi-tab refresh explicitly in Phase 3.
- Centralize token issuance/verification in one auth module; no ad-hoc JWT parsing elsewhere.
- Document cookie flags and required environment settings in `.env.example` and deployment docs.
- Plan signing-key rotation before production.

## Alternatives considered

1. **Server-side sessions only (opaque session cookie, no JWT).**
   Viable and simpler in some ways, but every API request becomes a session lookup (or cache dependency), and cross-origin cookie configuration becomes mandatory for all calls. Rejected for now; the access-token design keeps the hot path stateless while retaining server-side revocation.

2. **JWT access token in `localStorage`.**
   Rejected: any XSS yields a directly usable token, and revocation is limited to expiry or a denylist. This is the most common and most exploited shortcut.

3. **Long-lived JWT (days) with no refresh token.**
   Rejected: unacceptable revocation latency and blast radius after theft.

4. **Both access and refresh tokens in cookies.**
   Rejected: expands CSRF exposure to every endpoint and complicates non-browser clients. The chosen split keeps CSRF defense concentrated at the refresh/logout boundary.

5. **Refresh token stored in plaintext.**
   Rejected: a read-only database leak becomes full account takeover.

6. **Third-party identity provider (Auth0, Cognito, Clerk).**
   Not rejected on security grounds; deferred because the project brief requires an owned MERN auth implementation and local development without external dependencies. Can be revisited if operational identity management becomes a burden.

## Follow-up

- Phase 3 implements this ADR, including the session collection, rotation, reuse detection, audit logging, and tests.
- Phase 4 implements the client refresh flow, in-memory token holder, route guards, and multi-tab coordination.
- Phase 13 reviews cookie flags, CSRF coverage, token lifetimes, and revocation behavior against the deployed topology.
