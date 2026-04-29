# Dependency Security Audit — April 2026

## Summary

This document records the Dependabot security alerts addressed in the April 2026 audit, the actions taken, and any alerts intentionally deferred.

**Date:** April 29, 2026
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

## Deferred Alerts

### vite (>=7.3.2 / >=6.4.2 requested)

**Current version:** 5.4.21 (latest patched 5.x)
**Why deferred:** Forcing vite to 7.x+ breaks `vitest@1.6.1` which depends on vite 5.x. The vite 8.x resolution introduced `rolldown` native bindings that are incompatible with vitest 1.x, causing test failures. All production-relevant CVEs are already patched in 5.4.21. The remaining CVE (CVE-2025-24010) only affects the dev server CORS settings, not production builds.
**Resolution path:** Upgrade vitest from 1.x to 3.x (which uses vite 7+ as a peer dependency). This is a larger migration that should be planned separately.

### ajv (>=6.14.0 requested)

**Current version:** 6.12.6
**Why deferred:** `ajv@6.14.0` does not exist — ajv jumped from 6.12.x to 8.x. The only way to resolve this is upgrading to ajv 8.x, but eslint 8.x (used throughout the project) depends on ajv 6.x internally. Forcing ajv 8.x breaks eslint.
**Resolution path:** Upgrade eslint from 8.x to 9.x (which uses ajv 8.x). This is a larger migration that should be planned separately.

### rollup (>=4.59.0 requested)

**Current version:** 4.60.2
**Status:** Already resolved — the current version exceeds the required minimum. Alert will auto-close on next Dependabot scan.

## Impact Assessment

- All overrides target transitive dev dependencies except `postcss` (which has both dev and production usage via Next.js)
- The `next` bump is a minor version within the same major — backward compatible
- The `glob` (7→13) and `minimatch` (3/9→10) overrides are major version jumps but only affect dev tooling (`globby`, `rimraf`, `test-exclude`)
- The `picomatch` override (2→4) is a major version jump but `micromatch` (the consumer) supports both versions
- Build and type-check pass successfully after all changes
- No application code changes were required

## Files Modified

- `package.json` — Added `pnpm.overrides` section with 10 override entries
- `apps/web/package.json` — Bumped `next` from `^16.1.5` to `^16.2.3`
- `packages/ui/package.json` — Bumped `next` from `^16.1.5` to `^16.2.3`
- `pnpm-lock.yaml` — Regenerated to reflect all dependency changes
