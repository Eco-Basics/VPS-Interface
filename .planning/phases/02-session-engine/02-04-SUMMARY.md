---
phase: 02-session-engine
plan: "04"
subsystem: websocket
tags: [ws, jwt, node-pty, http-upgrade, session-registry]

requires:
  - phase: 02-02
    provides: session registry with createSession/getSession, PTY lifecycle management
  - phase: 02-03
    provides: attachSessionHandler(wss) WebSocket message router and ping/cleanup lifecycle

provides:
  - Authenticated WS upgrade flow via wss.handleUpgrade (missing/invalid token = 401, unknown session = 404, valid = 101)
  - Shared noServer WebSocketServer wired in server.ts bootstrap
  - Full end-to-end WS transport path from HTTP upgrade through PTY session

affects: [03-terminal-ui, 04-shell-launcher]

tech-stack:
  added: []
  patterns:
    - noServer WebSocketServer pattern — single shared wss instance, no listening port, upgrade events routed manually
    - Two-layer WS auth — JWT verified in upgrade handler, sessionId validated against registry before handshake completes

key-files:
  created: []
  modified:
    - src/ws/ws.upgrade.ts
    - src/server.ts
    - tests/ws.upgrade.test.ts

key-decisions:
  - "attachWebSocketAuth takes (server, wss) — wss injected rather than created inside the function so server.ts controls the shared instance lifetime"
  - "Session existence checked in upgrade handler (not ws.session handler) — rejects before TCP handshake completes, avoids connection then close pattern"

patterns-established:
  - "Upgrade handler pattern: verify JWT, validate sessionId, then wss.handleUpgrade — three-gate pattern before any WS frame is sent"
  - "noServer wss created in server.ts, passed into both upgrade auth and session handler — single source of truth for shared WS server"

requirements-completed: [SESS-03, SESS-05, TERM-01, TERM-02, TERM-03]

duration: 6min
completed: "2026-04-02"
---

# Phase 02 Plan 04: Session Engine Transport Wiring Summary

**Authenticated WS upgrade flow using handleUpgrade with per-session 401/404 gates, completing the session-engine transport path with all 45 Jest tests green**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-02T03:35:50Z
- **Completed:** 2026-04-02T03:41:50Z
- **Tasks:** 4
- **Files modified:** 3

## Accomplishments

- Replaced Phase 1 `501` stub in `ws.upgrade.ts` with real `wss.handleUpgrade(...)` authenticated flow — missing/invalid JWT returns 401, valid JWT with unknown sessionId returns 404, valid JWT with known session completes the HTTP 101 upgrade
- Updated `server.ts` to create a shared `WebSocketServer({ noServer: true })` and wire both `attachWebSocketAuth(server, wss)` and `attachSessionHandler(wss)` against it
- Updated and extended `tests/ws.upgrade.test.ts` with 404 and 101-success test cases, removed obsolete 501 expectation
- Full Jest suite: 45/45 tests green across all 5 suites with clean exit (no open handles)

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite ws.upgrade.ts** - `fb8c5b6` (feat)
2. **Task 2: Wire noServer WebSocketServer in server.ts** - `701c07e` (feat)
3. **Task 3: Update ws.upgrade tests** - `2e50357` (test)
4. **Task 4 / Rule 1 fix: Clear fallback timers** - `6457a52` (fix)

## Files Created/Modified

- `src/ws/ws.upgrade.ts` — Rewritten: `attachWebSocketAuth(server, wss)` with JWT verify, sessionId lookup, and `wss.handleUpgrade` on success
- `src/server.ts` — Updated: creates shared `WebSocketServer({ noServer: true })`, wires auth and session handlers
- `tests/ws.upgrade.test.ts` — Updated: new two-arg beforeAll, 404 test, 101-success test, removed 501 test, fixed timer leaks

## Decisions Made

- `attachWebSocketAuth` takes `(server, wss)` — wss injected rather than created inside the function so `server.ts` controls shared instance lifetime
- Session existence validated in the upgrade handler before `handleUpgrade` fires — cleaner rejection at the TCP level, avoids open-then-close WS pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cleared fallback setTimeout handles in sendUpgradeRequest**
- **Found during:** Task 4 (full suite run with --detectOpenHandles)
- **Issue:** Four `setTimeout(..., 1000)` fallback timers in the test helper remained pending after socket closed, preventing Jest from exiting cleanly
- **Fix:** Stored timer handle and called `clearTimeout` in the `close` and `error` handlers
- **Files modified:** `tests/ws.upgrade.test.ts`
- **Verification:** `npx jest --runInBand --detectOpenHandles` exits cleanly with no open handle warnings
- **Committed in:** `6457a52`

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Fix necessary for clean Jest exit. No scope creep.

## Issues Encountered

None beyond the timer leak caught by --detectOpenHandles.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full session-engine transport path is complete: HTTP auth, session lifecycle (PTY + registry), WS upgrade, and WS message routing all wired and tested end-to-end
- Phase 03 (terminal-ui) can integrate against the `/sessions/:id/ws?token=` URL contract with confidence
- No blockers

---
*Phase: 02-session-engine*
*Completed: 2026-04-02*
