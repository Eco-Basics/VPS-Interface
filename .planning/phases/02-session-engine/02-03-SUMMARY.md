---
phase: 02-session-engine
plan: 03
subsystem: ws-session-handler
tags: [websocket, session-bridge, pty, integration-tests, superwstest]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [attachSessionHandler, ws.session integration tests]
  affects: [src/ws/ws.session.ts, tests/ws.session.test.ts]
tech_stack:
  added: []
  patterns: [superwstest noServer integration tests, session-scoped client Set, buffer replay on connect]
key_files:
  created:
    - src/ws/ws.session.ts
  modified:
    - tests/ws.session.test.ts
decisions:
  - superwstest .wait(50) needed between sendJson and exec to allow server message processing
  - attachSessionHandler attaches to shared WebSocketServer via wss.on('connection')
  - buffer replay sent as single joined string before clients.add(ws) for race safety
metrics:
  duration: 7m
  completed_date: "2026-04-01T15:11:36Z"
  tasks_completed: 2
  files_changed: 2
requirements: [SESS-03, SESS-05, TERM-01, TERM-02, TERM-03]
---

# Phase 02 Plan 03: Session WebSocket Bridge Summary

**One-liner:** Per-session WebSocket handler with buffer replay, PTY input/resize routing, ping keepalive, and superwstest integration coverage for all 5 Phase 2 requirements.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement attachSessionHandler | 43559a4 | src/ws/ws.session.ts (created) |
| 2 | Replace ws.session todos with integration tests | 53b70de | tests/ws.session.test.ts |

## What Was Built

### Task 1: `src/ws/ws.session.ts`

Exports `attachSessionHandler(wss: WebSocketServer): void` which attaches to the shared `WebSocketServer`'s `connection` event. For each incoming connection:

1. Parses the URL to extract `sessionId` from `/sessions/:id/ws`
2. Closes with code `1008` if session not found (invalid path or unknown ID)
3. Replays `session.buffer.join('')` as a single string — transparent to xterm.js
4. If session is already exited: sends `{"type":"exit","exitCode":0}` then closes
5. If session is running: adds client to `session.clients` Set (after replay, avoiding race)
6. Routes client JSON messages: `input` → `session.pty.write()`, `resize` → `session.pty.resize()`, `ping` → `{"type":"pong"}`
7. Sends error envelope for unknown message types or malformed JSON
8. Cleans up from `session.clients` on both `close` and `error`
9. Runs a 30-second ping interval with auto-cleanup when socket closes

### Task 2: `tests/ws.session.test.ts`

Full integration test suite using `superwstest` against a real `http.Server` + `WebSocketServer({ noServer: true })`. Tests exercise the actual connection handler over a live TCP connection:

- **TERM-01**: Verifies PTY data forwarded to client as raw string (via buffer replay)
- **TERM-02**: Asserts `pty.write('ls\n')` called when `{"type":"input","data":"ls\n"}` sent
- **TERM-03**: Asserts `pty.resize(120, 40)` called on resize message
- **SESS-03**: Proves buffer replay works on reconnect — two consecutive connections both receive the full replay
- **SESS-05**: Proves `{"type":"exit","exitCode":0}` sent and socket closed when PTY exits

Test setup: `beforeAll` creates the WSS and attaches the handler once; `beforeEach` creates a fresh HTTP server and registry state per test; `afterEach` closes the server. This matches superwstest's recommended pattern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Previous plans (02-01, 02-02) state was partially committed**
- **Found during:** Pre-execution check
- **Issue:** STATE.md showed "Plan 1 of 4" for phase 02, but git log showed 02-01 and 02-02 work was already committed in prior sessions. `session.types.ts` already had `buffer`/`clients`, `session.registry.ts` already had the onData/onExit handlers, and `session.registry.test.ts` already had Phase 2 tests. No action needed — prerequisites were complete.
- **Fix:** Verified all dependencies were in place before proceeding with 02-03 tasks.
- **Files modified:** None

**2. [Rule 1 - Bug] superwstest .exec() timing issue**
- **Found during:** Task 2 execution
- **Issue:** `.sendJson().exec()` in superwstest executes the `exec` callback immediately before the server's `message` event handler fires. TERM-02 and TERM-03 tests failed because `pty.write`/`pty.resize` had not been called yet.
- **Fix:** Added `.wait(50)` between `.sendJson()` and `.exec()` to yield to the event loop and allow server message processing.
- **Files modified:** `tests/ws.session.test.ts`
- **Commit:** 53b70de (part of task commit)

## Verification Results

```
Test Suites: 5 passed, 5 total
Tests:       44 passed, 44 total
```

- `grep "export function attachSessionHandler" src/ws/ws.session.ts` → 1 match
- `grep "session.buffer.join" src/ws/ws.session.ts` → 1 match
- `grep "session.clients.add(ws)" src/ws/ws.session.ts` → 1 match
- `grep "test.todo" tests/ws.session.test.ts` → 0 matches
- `grep "superwstest" tests/ws.session.test.ts` → match found
- `npx jest --testPathPatterns=ws.session --runInBand` → exits 0

## Self-Check: PASSED

- `src/ws/ws.session.ts`: FOUND
- `tests/ws.session.test.ts`: FOUND (updated)
- Commit 43559a4: FOUND
- Commit 53b70de: FOUND
