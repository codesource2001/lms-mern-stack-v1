# Operations runbook

| Field     | Value                                                         |
| --------- | ------------------------------------------------------------- |
| Scope     | Routine checks, backups, restores, indexes, jobs, Redis, logs |
| Companion | [`DEPLOYMENT.md`](DEPLOYMENT.md) for deployment and rollback  |

Commands below assume Docker Compose with the production file. Substitute the local Compose file when operating a development stack.

## 1. Routine checks

```bash
docker compose -f docker-compose.prod.yml ps
curl -fsS http://localhost/health
curl -fsS http://localhost/health/ready
curl -fsS http://localhost/api/v1
```

- `/health` is liveness only; it has no dependency on MongoDB or Redis.
- `/health/ready` pings both dependencies with a bounded timeout and returns `503` when either is unavailable. Its `checks` object reports per-dependency status and latency.
- Application logs are JSON on stdout. Search by `requestId` (also returned as `x-request-id`) to correlate a client report with server logs.
- Background workers log `Background job worker started` at boot and one error line per failed job with `jobId`, `jobType`, and `attempts`.

## 2. MongoDB backups and restores

Backup:

```bash
docker compose -f docker-compose.prod.yml exec -T mongodb \
  mongodump --archive --uri "mongodb://<user>:<password>@localhost:27017/atrium?authSource=admin" \
  > atrium-backup.archive
```

Restore:

1. Stop the API: `docker compose -f docker-compose.prod.yml stop api`.
2. Restore into the empty or target database:
   ```bash
   docker compose -f docker-compose.prod.yml exec -T mongodb \
     mongorestore --archive --drop --uri "mongodb://<user>:<password>@localhost:27017/atrium?authSource=admin" \
     < atrium-backup.archive
   ```
3. Run seeds and index verification (below).
4. Start the API and verify readiness and a representative authenticated route.

Store backups off-host and encrypted. There is no automated backup schedule yet; add one before public traffic.

## 3. Redis operations

- Redis stores only operational job state. MongoDB remains the system of record for notifications and email delivery status; losing Redis does not lose user data.
- AOF persistence is enabled on the named volume. Do not delete the volume while jobs are pending.
- Key families: `atrium:jobs:pending`, `atrium:jobs:active`, `atrium:jobs:dead`, `atrium:jobs:job:*`, `atrium:jobs:slot:*`.
- Eviction policy should be `noeviction`. Do not use an LRU policy: dropping a pending job key silently loses work.
- Inspect job state with `redis-cli -a "$REDIS_PASSWORD" ZCARD atrium:jobs:pending` and `SCARD atrium:jobs:dead`.
- A dead job is exhausted after its retry limit. Inspect its `lastError` hash field before removing it.
- There is no application cache, so there is no cache invalidation policy to maintain.

## 4. MongoDB indexes

Production starts Mongoose with `autoIndex: false`, so indexes are created explicitly:

```bash
npm run indexes                         # development via tsx
docker compose -f docker-compose.prod.yml exec api node dist/seeds/indexes.cli.js
```

The CLI calls `createIndexes()` for all 22 models. It never drops existing indexes. Run it after every release that adds fields to an index, after restoring an empty database, and before enabling production traffic.

Phase 13 documented the query shapes behind every compound index in [`DATABASE.md`](DATABASE.md). Review that table when adding a list endpoint.

## 5. Seeds

```bash
npm run seed
docker compose -f docker-compose.prod.yml exec api node dist/seeds/seed.cli.js
```

Seeds create permissions and system roles idempotently and in dependency order. Re-run after a release that introduces a new permission code — for example, students received `analytics:read` in Phase 12. Seeds do not create user accounts.

## 6. Certificate and notification jobs

- Certificates are issued **on request**, idempotently; there is no scheduled auto-issuance. The background worker does not need a certificate job.
- `notification_email` sends pending notification emails. Status fields are `not_requested`, `pending`, `sent`, and `failed`; `emailAttempts` and `emailLastError` record retry history.
- `announcement_fanout` creates in-app notifications for active course enrollments. It is idempotent per announcement and recipient.
- `assignment_reminders` runs on a repeatable interval and creates one `24h` reminder per learner and assignment using a deterministic dedupe key.
- Jobs retry with exponential backoff and dead-letter after the configured attempt limit. A lease expiry can cause a second execution, so all handlers must remain idempotent.
- Workers currently run inside the API process. Restarting the API restarts the scheduler; scheduler slots in Redis prevent duplicate interval enqueues across instances.

## 7. Log redaction and observability

Pino redacts authorization headers, cookies, passwords, token material, and password hashes. When adding a sensitive field, add it to `backend/src/config/logger.ts`. Never log email bodies, recipient lists, raw tokens, or database errors to clients. Audit records are written for auth events, grading, enrollment state changes, announcements, and certificates; there is no audit read API yet.

## 8. Escalation

If readiness fails, check dependency connectivity and credentials before restarting containers. If a job is dead-lettered repeatedly, inspect `lastError` and the upstream provider rather than increasing the retry count. For security incidents, follow [`INCIDENT-RESPONSE.md`](INCIDENT-RESPONSE.md).
