# ADR-0003 — Runtime and toolchain pinning

- **Status:** Accepted
- **Date:** 24 November 2026
- **Deciders:** Project maintainer
- **Supersedes:** None

## Context

The project brief asks for current, non-deprecated packages and a reproducible build. "Latest" is not a stable target: major releases can land mid-phase, lint tooling often lags TypeScript majors, and a local runtime that differs from CI produces false confidence.

At Phase 1 kickoff (24 November 2026), the relevant facts were:

- Node.js 26 is the newest LTS line; the local machine runs **Node 24.14.1** with npm 11.12.1.
- TypeScript 7.x exists, but `typescript-eslint@8.74.0` declares support for TypeScript `<6.1.0`.
- Vite 8 and React Router 8 are current; React Router 8 no longer ships `react-router-dom`.
- ESLint 10 uses flat config; several plugins have moved to flat-config exports.
- `jsdom@30/31` require Node `^24.15.0`, newer than the local 24.14.1.

The toolchain must support strict TypeScript, type-aware linting, ESM, Vitest, React testing, and CI on Node 24.

## Decision

1. **Standardize on Node.js 24 LTS** for local development and CI, declared in `.nvmrc` and `engines` (`>=24.0.0`). Do not adopt Node 26 until Docker base images, CI, and the local toolchain are upgraded together.
2. **Pin TypeScript to 5.9.3.** Do not upgrade to TypeScript 7 until the lint stack supports it. Type-aware linting is a required gate; losing it to chase a compiler major is not acceptable.
3. **Pin every direct dependency to an exact version.** Commit `package-lock.json`. No `^` or `~` ranges for application dependencies.
4. **Use npm workspaces** with `frontend` and `backend` as independently buildable workspaces; root scripts orchestrate.
5. **Use ESLint 10 flat config** with `typescript-eslint`'s type-checked preset, scoped to TypeScript files. Config files are linted separately without type-aware rules.
6. **Use Vitest 5** for both workspaces, with jsdom pinned to **29.1.1** for frontend component tests because newer jsdom minors require Node ≥ 24.15.
7. **Use React Router 8** with imports from `react-router` and DOM exports from `react-router/dom`. Do not reintroduce `react-router-dom`.
8. **Verify versions at installation time** against the npm registry and official release notes; record the verification date in `README.md` and this repository.

## Consequences

**Positive**

- Local, CI, and container behavior can converge on one Node major.
- A green lint gate is preserved, including type-aware rules that catch real async and promise defects.
- Exact pins and a lockfile make installs reproducible and reviews meaningful.
- The toolchain is modern without relying on unsupported combinations.

**Negative / costs**

- The project is not on the newest Node LTS or TypeScript major. Some newer syntax or tooling may be unavailable.
- Exact pins require deliberate upgrade work; security patches do not arrive automatically.
- TypeScript 5.9 and ESLint 10 combinations must be re-verified on every upgrade.
- `jsdom` is held back, so frontend tests run on a slightly older DOM implementation.

**Mitigations**

- Review upgrades quarterly and immediately for security advisories.
- Upgrade in a dedicated change with a full green gate and an updated ADR when a major version changes.
- Track the TypeScript 7 unblock, Node 26 migration, and jsdom upgrade in `PLAN.md` open decisions.
- Keep CI on `.nvmrc` so the runtime decision has one source of truth.

## Alternatives considered

1. **Node 26 LTS now.** Rejected for Phase 1: the verified local runtime is 24.14.1, and upgrading the host, Docker images, and CI simultaneously adds risk with no feature benefit. Revisit in Phase 14.
2. **TypeScript 7 now.** Rejected: `typescript-eslint` does not support it, so the type-aware lint gate would fail or be disabled. Compiler novelty is not worth losing the gate.
3. **Semver ranges (`^`) for convenience.** Rejected: ranges make builds drift between machines and hide upgrade decisions inside lockfile churn. Exact pins make changes explicit.
4. **pnpm or Yarn workspaces.** Not rejected on merit; npm is already present, stable at 11.x, and sufficient. Switching adds migration cost without a current need.
5. **Linting without type information.** Rejected: type-aware rules catch floating promises, unsafe assignments, and misused async APIs that syntax-only linting misses.
6. **Keep `react-router-dom`.** Not possible with React Router 8; the package was removed. The v8 import split is the supported path.

## Follow-up

- Phase 2 verifies Mongoose, Redis, and OpenAPI tooling against Node 24 and TypeScript 5.9 before pinning.
- Once `typescript-eslint` supports TypeScript 7, open a dedicated upgrade ADR and run the full gate.
- In Phase 14, align Docker base images and CI on the same Node major, then re-evaluate Node 26.
- Re-check the jsdom pin when the local Node baseline reaches 24.15 or newer.
