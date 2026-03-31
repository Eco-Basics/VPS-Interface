---
phase: 1
slug: backend-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.3.0 + Supertest 7.2.2 + ts-jest 29.4.6 |
| **Config file** | `jest.config.ts` — Wave 0 creates this |
| **Quick run command** | `npx jest --testPathPattern="(auth|session.registry)" --passWithNoTests` |
| **Full suite command** | `npx jest --runInBand` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="(auth|session.registry)" --passWithNoTests`
- **After every plan wave:** Run `npx jest --runInBand`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | AUTH-01 | integration | `npx jest --testPathPattern=auth.router` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 0 | AUTH-02 | integration | `npx jest --testPathPattern=auth.router` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 0 | AUTH-03 | integration | `npx jest --testPathPattern=session.router` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 0 | AUTH-03 | integration | `npx jest --testPathPattern=ws.upgrade` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | SESS-01 | integration | `npx jest --testPathPattern=session.router` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | SESS-02 | unit | `npx jest --testPathPattern=session.registry` | ❌ W0 | ⬜ pending |
| 1-02-03 | 02 | 1 | SESS-04 | integration | `npx jest --testPathPattern=session.router` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `package.json` — `npm init` + install all dependencies (express, node-pty, jsonwebtoken, bcrypt, uuid, ws, dotenv)
- [ ] `tsconfig.json` — TypeScript config targeting Node 20+
- [ ] `jest.config.ts` — ts-jest preset, node environment
- [ ] `tests/auth.router.test.ts` — stubs for AUTH-01, AUTH-02, AUTH-03 (HTTP)
- [ ] `tests/session.router.test.ts` — stubs for SESS-01, SESS-04, AUTH-03 (sessions endpoints)
- [ ] `tests/session.registry.test.ts` — stubs for SESS-02 (unit, no HTTP)
- [ ] `tests/ws.upgrade.test.ts` — stubs for AUTH-03 (WebSocket upgrade rejection)
- [ ] `tests/__mocks__/node-pty.ts` — manual mock for node-pty (prevents real process spawning in tests)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claude process appears in `ps aux` after spawn | SESS-01 | Requires real VPS with `claude` on PATH | POST /sessions with valid cwd; SSH to VPS; run `ps aux \| grep claude` |
| Multiple PTY sessions remain running after API client disconnects | SESS-02 | Requires observing process persistence across connection lifecycle | Spawn 2 sessions; kill curl connection; check `ps aux` for both PIDs |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
