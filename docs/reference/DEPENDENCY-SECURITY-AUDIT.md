# Dependency Security Audit — April 2026

## Summary

This document records the Dependabot security alerts addressed in the April 2026 audit, the actions taken, and any alerts intentionally deferred.

**Date:** April 29, 2026
**Last Reviewed:** April 29, 2026
**Next Review:** July 29, 2026 (quarterly)
**Scope:** All critical and high severity Dependabot alerts on `pnpm-lock.yaml`

## Approach

Most vulnerable packages are transitive dependencies (not directly declared in any `package.json`). The fix strategy uses `pnpm.overrides` in the root `package.json` to force resolution to patched versions. One direct dependency (`next`) was bumped directly in the relevant `package.json` files.

## Resolved Alerts

### Via pnpm.overrides (transitive dependencies)

| Package | Old Version | New Version | Override | Alert Description |
|---|---|---|---|---|
| `basic-ftp` | 5.1.0 | 5.3.0 | `>=5.2.2` | #51 — Path Traversal in `downloadToDir()` |
| `handlebars` | 4.7.8 | 4.7.9 | `>=4.7.9` | #75 — JavaScript Injection via AST Type Confusion |
| `flatted` | 3.3.3 | 3.4.2 | `>=3.4.2` | Prototype pollution vulnerability (2 alerts) |
| `picomatch` | 2.3.1 | 4.0.4 | `>=4.0.4` | ReDoS vulnerability (4 alerts) |
| `glob` | 7.2.3 | 13.0.5 | `>=10.5.0` | ReDoS vulnerability (1 alert) |
| `minimatch` | 3.1.2 / 9.0.3 / 9.0.5 | 10.2.5 | `>=10.2.3` | ReDoS vulnerability (8 alerts) |
| `@xmldom/xmldom` | 0.9.8 | 0.9.10 | `>=0.9.10` | XML parsing vulnerabilities (5 alerts) |
| `lodash` | 4.17.23 | 4.18.1 | `>=4.18.0` | Prototype pollution vulnerability (2 alerts) |
| `postcss` | 8.4.31 | 8.5.12 | `>=8.5.10` | Line return parsing vulnerability (1 alert) |
| `tmp` | 0.0.33 | 0.2.5 | `>=0.2.4` | Insecure temporary file creation (1 alert) |

### Via direct dependency bump

| Package | Old Version | New Version | Location | Alert Description |
|---|---|---|---|---|
| `next` | ^16.1.5 (resolved 16.1.5) | ^16.2.3 (resolved 16.2.4) | `apps/web/package.json`, `packages/ui/package.json` | #90 — Denial of Service with Server Components |

### Via vitest major version upgrade (1.x → 3.x)

The vitest upgrade from 1.x to 3.x resolved two alerts by pulling in patched versions of vite and esbuild as transitive dependencies.

| Package | Old Version | New Version | Alert Description |
|---|---|---|---|
| `vitest` | ^1.6.0 (resolved 1.6.1) | ^3.2.0 | Test runner upgrade to unblock vite/esbuild fixes |
| `@vitest/coverage-v8` | ^1.6.0 | ^3.2.0 | Aligned with vitest version |
| `vite` (transitive) | 5.4.21 | 7.3.2 | #86 — Path Traversal in Optimized Deps `.map` Handling |
| `esbuild` (transitive) | 0.21.5 | 0.27.2 | #39 — Dev server request vulnerability |

Updated in: `apps/web/package.json`, `packages/ui/package.json`, `packages/bcbc-parser/package.json`, `packages/search-indexer/package.json`, `packages/content-chunker/package.json`

**Note:** 11 pre-existing test failures in `apps/web` were observed after the upgrade. These are not caused by the vitest upgrade — they are stale test assertions where the component rendering changed but the tests were not updated (Breadcrumbs, NavigationTree, PrevNextNav, TableBlock). All other test suites (bcbc-parser, search-indexer, content-chunker, ui) pass cleanly.

## Deferred Alerts

Items below were intentionally deferred due to breaking changes. Each has an owner, target date, and resolution path. These should be revisited at the next review date (see header).

### ajv (>=6.14.0 requested) — #49

**Current version:** 6.12.6
**Severity:** Moderate
**Owner:** TBD (assign to team member)
**Target date:** Q3 2026
**Why deferred:** `ajv@6.14.0` does not exist — ajv jumped from 6.12.x to 8.x. The only way to resolve this is upgrading to ajv 8.x, but eslint 8.x (used throughout the project) depends on ajv 6.x internally. Forcing ajv 8.x breaks eslint.
**Resolution path:** Upgrade eslint from 8.x to 9.x (which uses ajv 8.x). This requires migrating to eslint flat config and updating all eslint plugins/configs across the monorepo.
**Risk:** Moderate severity, dev-only — used by eslint for config schema validation, not exposed in production.

### PostCSS XSS (#96)

**Current version:** 8.5.12
**Severity:** Moderate
**Owner:** TBD (assign to team member)
**Target date:** May 2026 (check for patched postcss release)
**Status:** The `postcss >= 8.5.10` override is already in place and 8.5.12 is the only version in the lockfile. This alert (#96, opened yesterday) may require a newer patch (e.g., `>=8.5.13`). Monitor for updated fix version from Dependabot.
**Resolution path:** Update the postcss override to the patched version once available, then run `pnpm install`.

## Impact Assessment

- All overrides target transitive dev dependencies except `postcss` (which has both dev and production usage via Next.js)
- The `next` bump is a minor version within the same major — backward compatible
- The `glob` (7→13) and `minimatch` (3/9→10) overrides are major version jumps but only affect dev tooling (`globby`, `rimraf`, `test-exclude`)
- The `picomatch` override (2→4) is a major version jump but `micromatch` (the consumer) supports both versions
- Build and type-check pass successfully after all changes
- No application code changes were required

## Files Modified

- `package.json` — Added `pnpm.overrides` section with 10 override entries
- `apps/web/package.json` — Bumped `next`, `vitest` (1.x→3.x), `@vitest/coverage-v8` (1.x→3.x)
- `packages/ui/package.json` — Bumped `next`, `vitest` (1.x→3.x), `@vitest/coverage-v8` (1.x→3.x)
- `packages/bcbc-parser/package.json` — Bumped `vitest` (1.x→3.x)
- `packages/search-indexer/package.json` — Bumped `vitest` (1.x→3.x)
- `packages/content-chunker/package.json` — Bumped `vitest` (1.x→3.x)
- `pnpm-lock.yaml` — Regenerated to reflect all dependency changes
