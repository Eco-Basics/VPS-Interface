---
phase: 01-backend-foundation
plan: 02
subsystem: auth
tags: [jwt, bcrypt, express, middleware, auth]
dependency_graph:
  requires: [01-01]
  provides: [requireAuth middleware, createAuthRouter factory, createApp factory]
  affects: [01-03, 01-04]
tech_stack:
  added: [ts-node, "@types/jsonwebtoken"]
  patterns: [app/server separation, factory pattern for testability, TDD red-green]
key_files:
  created:
    - src/auth/auth.middleware.ts
    - src/auth/auth.router.ts
    - src/app.ts
    - tests/auth.router.test.ts
    - jest.config.ts
  modified:
    - package.json
    - package-lock.json
decisions:
  - createApp() async factory pattern chosen over module-level singleton — avoids async mount race condition in tests
  - requireAuth applied after /auth mount so login route is exempt without special exclusion logic
  - passwordHash passed as parameter to createAuthRouter — avoids module-level side effects and re-hashing per request
metrics:
  duration: 360s
  completed: "2026-04-01"
  tasks_completed: 2
  files_changed: 7
---

# Phase 01 Plan 02: Authentication Layer Summary

JWT middleware and Express app factory with bcrypt password hashing, 6 integration tests all green.

## Tasks Completed

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | JWT middleware + auth router + test suite (TDD) | 42d1fab | done |
| 2 | Express app factory (createApp async factory) | 54c9458 | done |

## What Was Built

**src/auth/auth.middleware.ts** — `requireAuth` Express middleware. Validates `Authorization: Bearer <token>` header, calls `jwt.verify` with `{ algorithms: ['HS256'] }`. Returns 401 with `{ error: string }` on missing header or invalid token.

**src/auth/auth.router.ts** — `createAuthRouter(passwordHash)` factory. Returns Router with `POST /login` handler that uses `bcrypt.compare` and signs a 7-day HS256 JWT. Password hash is injected at startup — never re-computed per request.

**src/app.ts** — `createApp()` async factory. Validates `PASSWORD` and `JWT_SECRET` env vars (throws if missing), pre-hashes password at bcrypt cost factor 12, mounts `/auth` router before `requireAuth` middleware, adds placeholder `GET /sessions` route returning `[]`.

**tests/auth.router.test.ts** — 6 integration tests covering AUTH-01 (correct/wrong password), AUTH-02 (7-day expiry), AUTH-03 (missing header 401, malformed token 401, valid token 200).

**jest.config.ts** — ts-jest preset for Node environment.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] jest.config.ts missing — test infrastructure not created by 01-01**
- Found during: Task 1 (RED phase)
- Issue: jest.config.ts referenced in plan did not exist; Jest could not run at all
- Fix: Created jest.config.ts with ts-jest preset and node environment
- Files modified: jest.config.ts
- Commit: 42d1fab

**2. [Rule 3 - Blocking] ts-node missing — required for TypeScript jest.config.ts**
- Found during: Task 1 (RED phase)
- Issue: Jest 30 requires ts-node to parse jest.config.ts
- Fix: `npm install --save-dev ts-node`
- Commit: 54c9458

**3. [Rule 3 - Blocking] @types/jsonwebtoken missing**
- Found during: Task 1 (RED phase)
- Issue: TypeScript compilation error in test file — no type declarations for jsonwebtoken
- Fix: `npm install --save-dev @types/jsonwebtoken`
- Commit: 54c9458

## Test Results

```
Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
Time:        3.754s
```

All AUTH-01, AUTH-02, AUTH-03 (HTTP) acceptance criteria satisfied.

## Self-Check: PASSED
