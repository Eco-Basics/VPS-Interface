---
phase: 01-backend-foundation
plan: 01
subsystem: project-bootstrap
tags: [scaffold, jest, typescript, node-pty, dependencies]
dependency_graph:
  requires: []
  provides: [package.json, tsconfig.json, jest.config.ts, node-pty-mock, test-stubs]
  affects: [01-02, 01-03, 01-04]
tech_stack:
  added: [express@5.2.1, jsonwebtoken@9.0.3, bcrypt@6.0.0, node-pty@1.1.0, uuid@9.0.1, ws@8.20.0, dotenv, jest@30.3.0, ts-jest@29.4.6, supertest@7.2.2, typescript]
  patterns: [ts-jest CJS preset, moduleNameMapper manual mock, test.todo stubs]
key_files:
  created:
    - package.json
    - tsconfig.json
    - .env.example
    - jest.config.ts
    - tests/__mocks__/node-pty.ts
    - tests/session.router.test.ts
    - tests/ws.upgrade.test.ts
  modified: []
decisions:
  - uuid downgraded to v9.0.1 — v13 is ESM-only which breaks ts-jest CJS preset
  - node-pty mock wired via moduleNameMapper globally — no jest.mock() needed in test files
  - bcryptjs fallback documented in .env.example for VPS native build failures
metrics:
  duration: 22m
  completed: "2026-04-01T13:29:32Z"
  tasks_completed: 3
  files_created: 7
---

# Phase 01 Plan 01: Project Bootstrap and Test Infrastructure Summary

**One-liner:** npm project initialized with ts-jest/node-pty mock infrastructure and all Wave 0 test stubs — `npx jest --passWithNoTests` exits 0.

## What Was Built

Wave 0 bootstrap for the Claude VPS Interface backend. Greenfield project initialized with all production and dev dependencies, TypeScript configured for Node 20 CommonJS, Jest configured with ts-jest preset and a node-pty manual mock via `moduleNameMapper`, and four test stub files covering all six phase requirement IDs (AUTH-01, AUTH-02, AUTH-03, SESS-01, SESS-02, SESS-04).

## Tasks Completed

| Task | Description | Commit | Key Files |
|------|-------------|--------|-----------|
| 1 | Initialize project and install dependencies | 7086d58 | package.json, tsconfig.json, .env.example |
| 2 | Configure Jest and create node-pty manual mock | 4792c42 | jest.config.ts, tests/__mocks__/node-pty.ts |
| 3 | Create all test stub files | cbcb46b | tests/session.router.test.ts, tests/ws.upgrade.test.ts |

## Verification Results

```
Test Suites: 4 passed, 4 total
Tests:       11 todo, 21 passed, 32 total
npx jest --passWithNoTests exits 0
```

Note: By the time Plan 01-01 executed, prior commits (42d1fab, 54c9458, fe08857) had already created `src/app.ts`, `src/auth/`, `src/sessions/session.registry.ts`, `tests/auth.router.test.ts`, and `tests/session.registry.test.ts` with real assertions (Plans 01-02 and 01-03 pre-executed). The 21 passing tests come from those real test files. The 11 todos come from the stub files created here.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] uuid v13 ESM incompatibility with ts-jest CJS preset**
- **Found during:** Task 3 verification
- **Issue:** uuid@13.0.0 has `"type": "module"` — ESM-only package. ts-jest in CommonJS mode throws `SyntaxError: Unexpected token 'export'` when session.registry.ts imports uuid.
- **Fix:** Downgraded uuid to v9.0.1 (last CJS-compatible major version). The v4 API is identical: `import { v4 as uuidv4 } from 'uuid'` works in both.
- **Files modified:** package.json, package-lock.json
- **Commit:** cbcb46b

### Context Notes

- The linter/auto-tooling created jest.config.ts and src/ files before this plan executed. This plan accepted those artifacts and built on top of them rather than replacing them.
- tests/auth.router.test.ts and tests/session.registry.test.ts were created by prior commits with real assertions — this plan created the two remaining stub files (session.router, ws.upgrade).

## Self-Check: PASSED

All 7 key files exist. All 3 task commits verified (7086d58, 4792c42, cbcb46b).
