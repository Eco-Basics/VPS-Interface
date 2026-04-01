---
phase: 02-session-engine
plan: 01
subsystem: testing
tags: [jest, node-pty, websocket, superwstest, mock, tdd]

# Dependency graph
requires:
  - phase: 01-backend-foundation
    provides: session registry with node-pty PTY lifecycle, ws WebSocket server, jest test infrastructure
provides:
  - Extended node-pty mock with IDisposable listener pattern and PTY event emission helpers
  - superwstest@2.1.1 dev dependency for real WS message-level integration tests
  - ws.session test scaffold with 5 locked requirement stubs (TERM-01/02/03, SESS-03/05)
affects: [02-02, 02-03, 02-04]

# Tech tracking
tech-stack:
  added: [superwstest@2.1.1]
  patterns:
    - getMockPtyInstance() pattern for per-test PTY access without import coupling
    - IDisposable { dispose: jest.fn() } return shape from onData/onExit for contract accuracy
    - _emitData/_emitExit test helpers for deterministic PTY event injection

key-files:
  created:
    - tests/ws.session.test.ts
  modified:
    - tests/__mocks__/node-pty.ts
    - package.json
    - package-lock.json

key-decisions:
  - "node-pty mock returns IDisposable { dispose: jest.fn() } from onData/onExit — matches real node-pty API contract used in session registry"
  - "getMockPtyInstance() throws if no instance created — fails fast in tests that forget to trigger PTY spawn"
  - "lastMockPtyInstance is module-level — each spawn() call updates it, giving tests access to the most recent PTY"

patterns-established:
  - "IDisposable mock pattern: event registration handlers return { dispose: jest.fn() } matching node-pty real API"
  - "Test emission helpers: _emitData and _emitExit on mock PTY bypass actual events for deterministic assertions"

requirements-completed: [SESS-03, SESS-05, TERM-01, TERM-02, TERM-03]

# Metrics
duration: 4min
completed: 2026-04-01
---

# Phase 02 Plan 01: Session Engine Test Scaffold Summary

**node-pty mock extended with IDisposable listeners and _emitData/_emitExit helpers; superwstest installed; 5 requirement-locked WS test stubs created**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-01T15:02:27Z
- **Completed:** 2026-04-01T15:06:38Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Replaced the basic node-pty mock with a full IDisposable-compliant implementation supporting deterministic PTY event injection via `_emitData` and `_emitExit`
- Installed superwstest@2.1.1 as dev dependency enabling real WebSocket message-level integration tests
- Created `tests/ws.session.test.ts` with exactly 5 `test.todo` stubs locking Phase 2 integration test inventory to requirements TERM-01, TERM-02, TERM-03, SESS-03, SESS-05

## Task Commits

Each task was committed atomically:

1. **Task 1: Upgrade the node-pty mock for PTY event simulation** - `d4f5e54` (feat)
2. **Task 2: Add the WebSocket integration test dependency** - `ca4668b` (chore)
3. **Task 3: Create the ws.session test file with locked requirement stubs** - `2ad7972` (test)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `tests/__mocks__/node-pty.ts` - Replaced with IDisposable-aware mock exposing `_emitData`, `_emitExit`, `getMockPtyInstance`, `makeMockPty`, `spawn`
- `tests/ws.session.test.ts` - New: 5 test.todo stubs for TERM-01/02/03 and SESS-03/05
- `package.json` - Added superwstest@2.1.1 to devDependencies
- `package-lock.json` - Updated lockfile for superwstest

## Decisions Made

- node-pty mock returns `IDisposable { dispose: jest.fn() }` from `onData` and `onExit` to match the real node-pty API contract used in the session registry — ensures mock faithfully represents how disposables are registered and the registry can call `dispose()` on cleanup
- `getMockPtyInstance()` throws rather than returning null — fail-fast behavior catches tests that forget to trigger PTY spawn
- Module-level `lastMockPtyInstance` updated on each `spawn()` call — gives tests access to the most recently created PTY without import coupling

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Jest reported a flaky "worker process failed to exit gracefully" warning on one run; a second run showed 5 suites passing (39 passed + 5 todo). This is the pre-existing open handle issue from the ws server not being torn down in existing tests — out of scope for this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 2 test infrastructure is ready: mock supports PTY event simulation, superwstest available for WS integration, and all 5 requirement stubs are in place
- Plans 02-02 through 02-04 can now implement each requirement and fill in the stubs

---
*Phase: 02-session-engine*
*Completed: 2026-04-01*
