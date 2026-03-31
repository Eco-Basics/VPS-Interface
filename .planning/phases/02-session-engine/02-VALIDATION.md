---
phase: 2
slug: session-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest + ts-jest (established in Phase 1) |
| **Config file** | jest.config.ts (exists from Phase 1) |
| **Quick run command** | `npx jest --testPathPattern=ws --runInBand` |
| **Full suite command** | `npx jest --runInBand` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern=ws --runInBand`
- **After every plan wave:** Run `npx jest --runInBand`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 02-01-01 | 01 | 0 | SESS-03, TERM-01, TERM-02, TERM-03 | stub | `npx jest --passWithNoTests` | ⬜ pending |
| 02-02-01 | 02 | 1 | SESS-03, TERM-01 | integration | `npx jest --testPathPattern=ws.session` | ⬜ pending |
| 02-02-02 | 02 | 1 | TERM-02, TERM-03 | integration | `npx jest --testPathPattern=ws.session` | ⬜ pending |
| 02-03-01 | 03 | 1 | SESS-05 | integration | `npx jest --testPathPattern=ws.session` | ⬜ pending |
| 02-04-01 | 04 | 2 | SESS-03, SESS-05 | integration | `npx jest --runInBand` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/ws.session.test.ts` — stubs for SESS-03, SESS-05, TERM-01, TERM-02, TERM-03
- [ ] `tests/__mocks__/node-pty.ts` — update to add `_emitData(data)` and `_emitExit(code)` test helpers and return `{ dispose: jest.fn() }` from onData/onExit
- [ ] `superwstest` — install `npm install --save-dev superwstest` for WebSocket integration testing

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| xterm.js renders ANSI color correctly | TERM-01 | Visual — requires browser | Connect browser terminal to WS session, run `ls --color=always`, verify colored output |
| Claude interactive prompts (approve/deny) work | TERM-02 | Requires real Claude process | Spawn session, send input to trigger diff/approve prompt, verify prompt renders and responds |
| SIGWINCH reflows Claude output | TERM-03 | Requires real Claude + resize | Connect browser, resize window, verify Claude re-wraps long lines |
| Reconnect replays scrollback correctly | SESS-03 | End-to-end browser test | Close browser tab, reopen, verify previous output appears before live stream |
