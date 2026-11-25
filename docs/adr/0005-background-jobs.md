# ADR-0005 — Background job runner

| Field           | Value               |
| --------------- | ------------------- |
| Status          | Accepted — Phase 12 |
| Date            | 25 November 2026    |
| Decision makers | Atrium maintainers  |

## Context

Phase 12 requires assignment deadline reminders, announcement fan-out, and delivery of notification emails. These operations must be idempotent and retryable, and they must not make HTTP requests wait on external providers.

The roadmap left the runner open: BullMQ or an alternative, with retries and idempotency. Registry lookups for BullMQ failed with `ENOTFOUND` in the development environment, while the already-pinned `redis@6.4.0` client and Redis service were healthy. Installing an unverified version would break the repository rule that packages are version-checked before being pinned.

## Decision

Implement a small durable job runner in `backend/src/infrastructure/jobs/` using the existing Redis client. Jobs are stored as Redis hashes with a stable, caller-supplied identifier. A sorted set holds scheduled run times, an active set holds leased jobs, and a dead-letter set holds exhausted jobs. A worker polls on a bounded interval, claims due jobs atomically with Lua scripts, runs registered handlers, and retries failures with exponential backoff.

Repeatable work uses scheduler slots: the worker derives a slot from the current time and attempts an idempotent Redis `SET NX` for that slot before enqueueing. Duplicate worker instances therefore cannot enqueue the same interval twice.

The runner is started inside the API process behind `JOBS_WORKER_ENABLED`. A dedicated worker process can be split out in Phase 14 without changing the queue or handlers.

## Consequences

**Positive**

- No new backend dependency; all packages remain verified and pinned.
- Deterministic job IDs make enqueue and reminder creation idempotent.
- Retries, backoff, lease recovery, and dead-lettering are explicit and testable.
- Redis remains operational state; MongoDB remains the system of record for notifications and delivery outcomes.

**Negative / accepted**

- No management UI, priority queues, or rate-limited queues. These are not required by Phase 12.
- Throughput is bounded by the poll interval and claim limit; appropriate for reminders and low-volume fan-out.
- Handlers must be idempotent because a lease expiry can cause a second execution. Notification writes use unique indexes to enforce this.
- Running workers in the API process couples scaling of HTTP and jobs until Phase 14.
