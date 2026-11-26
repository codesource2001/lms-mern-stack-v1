# Incident response and secret rotation

| Field   | Value                                          |
| ------- | ---------------------------------------------- |
| Status  | Template — no production deployment exists yet |
| Owner   | Repository maintainers                         |
| Updated | 26 November 2026                               |

This process is written in advance so a maintainer can act without inventing steps during an incident.

## 1. Severity

| Severity | Example                                                    | Response                                    |
| -------- | ---------------------------------------------------------- | ------------------------------------------- |
| SEV-1    | Active data breach, account takeover at scale, full outage | Page maintainers immediately; contain first |
| SEV-2    | Single-tenant authorization failure, degraded core flow    | Investigate within one working day          |
| SEV-3    | Non-blocking defect, suspicious rate-limit spike           | Track in the normal issue queue             |

## 2. Process

1. **Detect** — alert, user report, or failed health/readiness check. Record the time, request IDs, and affected endpoints.
2. **Contain** — revoke affected sessions with the existing admin flow, block an origin at the proxy, or stop the API container if data is actively being exposed.
3. **Preserve** — snapshot logs and relevant records before remediation. Do not delete job keys or audit logs while investigating.
4. **Assess** — determine scope, affected users, data classes, and whether personal data was exposed.
5. **Eradicate** — patch the defect, rotate exposed secrets, add a regression test, and deploy the fix.
6. **Notify** — follow applicable legal and contractual obligations if personal data was involved.
7. **Learn** — write a blameless postmortem with contributing factors and tracked follow-ups.

Use `x-request-id` from the client report and Pino logs to reconstruct the request path. Error responses include the same ID.

## 3. Secret rotation

| Secret                 | Rotation procedure                                                                                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AUTH_JWT_SECRET`      | Generate a new 32+ character value, update the environment, restart all API instances. Access tokens issued before rotation become invalid; refresh tokens remain valid. Prefer a staggered deploy with overlapping keys if zero downtime is required. |
| `AUTH_METADATA_SECRET` | Rotate with `AUTH_JWT_SECRET`; must remain a different value. Existing verification/reset hashes stop validating; reissue affected tokens.                                                                                                             |
| `MONGO_ROOT_PASSWORD`  | Update MongoDB user password and `MONGODB_URI` together, then restart API instances.                                                                                                                                                                   |
| `REDIS_PASSWORD`       | Update Redis `requirepass` and `REDIS_URL` together, then restart API and any workers.                                                                                                                                                                 |
| SMTP credentials       | Update `SMTP_USER`/`SMTP_PASSWORD` and restart the API. No token impact.                                                                                                                                                                               |
| Signing or TLS keys    | Rotate at the proxy or hosting layer; restart proxy after deployment.                                                                                                                                                                                  |

Never commit rotated values. Update `deploy/.env.example` only with placeholders. After any rotation, verify `/health/ready`, a login, and a protected route.

## 4. Contact and disclosure

Report suspected vulnerabilities privately through a GitHub security advisory on `codesource2001/lms-mern-stack-v1`, or contact the repository owner directly. Do not publish exploit details, credentials, or personal data in a public issue.
