---
phase: 02-session-engine
plan: "02"
subsystem: api
tags: [node-pty, websocket, ring-buffer, session-registry, jest, tdd]

requires:
  - phase: 02-01
    provides: node-pty mock with disposable pattern, session.registry.ts base structure, SessionRecord shape

provides:
  - SessionRecord extended with buffer (ring buffer of PTY output) and clients (active WS Set)
  - One-time onData registration in createSession() buffering all PTY output from spawn time
  - Ring buffer capped at 1000 entries with shift-on-overflow eviction
  - PTY exit broadcast: JSON {type, exitCode} to all open clients, close, clear clients set
  - 22-test suite covering Phase 1 + Phase 2 registry behaviors

affects:
  - 02-03 (ws.session.ts uses record.clients Set for attach/detach)
  - 02-04 (replay handler reads record.buffer for reconnect)

tech-stack:
  added: []
  patterns:
    - Single onData registration per session inside createSession() — no per-request listener registration
    - Ring buffer cap via buffer.length > 1000 + shift() — O(1) amortized cost
    - Disposable pattern: onData/onExit both return {dispose()} called in exit handler to prevent double-fire
    - clients Set owned by registry record — WS handler only adds/removes, never creates
    - Exit handler clears clients set after broadcasting — prevents stale client accumulation

key-files:
  created: []
  modified:
    - src/sessions/session.types.ts
    - src/sessions/session.registry.ts
    - tests/session.registry.test.ts
    - tests/__mocks__/node-pty.ts

key-decisions:
  - "Disposable returned by onData stored as dataDisposable and called in exit handler — prevents onData firing after process exits"
  - "exitDisposable.dispose() called at end of exit handler — prevents exit handler re-entry if PTY fires exit twice"
  - "record.status = 'exited' moved into the exit handler (was standalone) — single exit handler owns all exit-time mutations"

patterns-established:
  - "Registry-owned clients Set: WS session handler adds/removes clients but never creates or destroys the Set"
  - "PTY listeners registered exactly once at session creation, never again"

requirements-completed: [SESS-03, SESS-05, TERM-01, TERM-02, TERM-03]

duration: 12min
completed: 2026-04-01
---

# Phase 02 Plan 02: Session Engine — Ring Buffer and Client Fan-out Summary

**PTY output ring buffer (1000-entry cap) and WebSocket client fan-out wired into createSession(), with exit broadcast and disposable cleanup pattern**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-01T15:02:42Z
- **Completed:** 2026-04-01T15:14:42Z
- **Tasks:** 3
- **Files modified:** 4 (session.types.ts, session.registry.ts, session.registry.test.ts, node-pty mock)

## Accomplishments
- Extended `SessionRecord` with `buffer: string[]` and `clients: Set<WebSocket>` for Phase 2 runtime state
- Registered a single `onData` listener inside `createSession()` that buffers chunks and fan-outs to all open WebSocket clients
- Implemented ring buffer eviction: when `buffer.length > 1000`, oldest entry is shifted out
- Exit handler broadcasts `{type: "exit", exitCode}` JSON to all open clients, closes them, clears the set, and disposes both listeners
- 7 new Phase 2 tests covering buffer init, data population, ring cap, client Set init, fan-out, exit payload, and client close — total test suite is 22 tests, all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend SessionRecord with replay buffer and client tracking** - `951b28f` (feat)
2. **Task 2: Populate buffer and broadcast from session.registry createSession()** - `37db113` (feat)
3. **Task 3: Add session.registry tests for Phase 2 runtime behavior** - `e41470f` (test)

## Files Created/Modified
- `src/sessions/session.types.ts` - Added `buffer: string[]` and `clients: Set<WebSocket>` fields, imported WebSocket type from ws
- `src/sessions/session.registry.ts` - Added buffer/clients initialization, onData fan-out with ring cap, onExit broadcast with disposable cleanup
- `tests/session.registry.test.ts` - Added 7 Phase 2 tests for ring buffer, client tracking, and exit broadcast; imported getMockPtyInstance
- `tests/__mocks__/node-pty.ts` - Already updated by 02-01 with _emitData/_emitExit/getMockPtyInstance helpers; onData/onExit return {dispose} objects

## Decisions Made
- `dataDisposable.dispose()` called at exit time to prevent the data listener firing after process termination
- `exitDisposable.dispose()` called at end of exit handler to guard against double-fire (defensive, node-pty may fire exit once but this is free)
- `record.status = 'exited'` moved from standalone `onExit` call into the Phase 2 exit handler — single handler owns all exit-time mutations, cleaner than two separate `onExit` registrations

## Deviations from Plan

None — plan executed exactly as written. The mock (`node-pty.ts`) had already been updated with the disposable pattern and emit helpers required by this plan (done in 02-01 scope).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `record.clients` Set is ready for `ws.session.ts` (02-03) to add/remove connected WebSocket clients
- `record.buffer` is populated from spawn time and ready for replay endpoint (02-04)
- All 22 tests green; no blockers for 02-03

## Self-Check: PASSED

All files confirmed present. All task commits confirmed in git history.

---
*Phase: 02-session-engine*
*Completed: 2026-04-01*
