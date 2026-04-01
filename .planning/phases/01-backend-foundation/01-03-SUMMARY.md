---
phase: 01-backend-foundation
plan: 03
subsystem: api
tags: [node-pty, uuid, session-registry, pty, jest, typescript]

# Dependency graph
requires:
  - phase: 01-backend-foundation/01-01
    provides: package.json with node-pty, uuid, jest, ts-jest dependencies; jest.config.ts; node-pty mock

provides:
  - SessionRecord interface (id, pid, pty, cwd, createdAt, status) in session.types.ts
  - SessionListItem interface (API-safe, no pty field) in session.types.ts
  - toListItem() converter function
  - Module-level Map registry with createSession, getSession, killSession, listSessions
  - SIGTERM + 5s SIGKILL fallback in killSession
  - Sanitized PTY spawn env (removes SSH_TTY/SSH_CONNECTION/SSH_CLIENT/CI, per-session CLAUDE_CONFIG_DIR)
  - 15 passing unit tests for session lifecycle

affects: [02-session-engine, 01-04-server-wiring, 03-terminal-ui]

# Tech tracking
tech-stack:
  added: [node-pty (PTY spawn), uuid (v4 session IDs), jest fake timers (setTimeout testing)]
  patterns:
    - Module-level Map as singleton session registry (PTY lifetime owned by registry, not request handlers)
    - Sanitized env before PTY spawn (SSH/CI vars removed, CLAUDE_CONFIG_DIR per-session)
    - SIGTERM + delayed SIGKILL pattern for graceful PTY termination
    - toListItem() converter strips non-serializable objects before API responses
    - transformIgnorePatterns to allow ts-jest to transform ESM-only uuid v13

key-files:
  created:
    - src/sessions/session.types.ts
    - src/sessions/session.registry.ts
    - tests/session.registry.test.ts
  modified:
    - jest.config.ts (added transformIgnorePatterns for uuid ESM compatibility)

key-decisions:
  - "SessionRecord stored in Map — PTY lifetime owned by registry, not WebSocket/request handler (enables SESS-02)"
  - "Status transitions to 'exited' in-place, record never removed from Map (Phase 2 needs exited session inspection for reconnect)"
  - "CLAUDE_CONFIG_DIR set to /tmp/claude-sessions/{id} per session — prevents concurrent session transcript corruption"
  - "toListItem() strips pty field from API responses — pty.IPty is not JSON-serializable"
  - "transformIgnorePatterns excludes uuid from node_modules ignore — uuid v13 is ESM-only, ts-jest must transform it"

patterns-established:
  - "PTY registry pattern: module-level Map, status in-place mutation, never delete"
  - "Env sanitization pattern: spread process.env, delete SSH/CI keys, set TERM/COLORTERM/CLAUDE_CONFIG_DIR"
  - "Kill pattern: SIGTERM immediately, setTimeout SIGKILL after 5000ms if status !== 'exited'"

requirements-completed: [SESS-01, SESS-02, SESS-04]

# Metrics
duration: 25min
completed: 2026-04-01
---

# Phase 01 Plan 03: Session Registry Summary

**In-memory PTY session registry with UUID v4 IDs, sanitized spawn env, SIGTERM+SIGKILL kill pattern, and 15 passing unit tests**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-01T13:02:00Z
- **Completed:** 2026-04-01T13:27:38Z
- **Tasks:** 2 completed (Task 1: types, Task 2: registry + tests)
- **Files modified:** 4 (session.types.ts created, session.registry.ts created, session.registry.test.ts created, jest.config.ts updated)

## Accomplishments

- SessionRecord and SessionListItem interfaces with toListItem() converter — shape locked per CONTEXT.md decisions
- Module-level Map registry implementing SESS-02 (sessions survive browser close — PTY owned by Map, not request handler)
- killSession() with SIGTERM + 5s SIGKILL fallback satisfying SESS-03 readiness
- Sanitized PTY spawn env: SSH vars and CI removed, TERM/COLORTERM/CLAUDE_CONFIG_DIR set per-session
- 15 unit tests covering all session lifecycle operations pass green

## Task Commits

Each task was committed atomically:

1. **Task 1: Define session types** - `0b9a92e` (feat)
2. **Task 2: RED — add failing tests** - `fe08857` (test)
3. **Task 2: GREEN — implement registry** - `8f37dff` (feat)

_TDD task has two commits: test (RED) then feat (GREEN)_

## Files Created/Modified

- `src/sessions/session.types.ts` - SessionRecord, SessionListItem interfaces and toListItem() converter
- `src/sessions/session.registry.ts` - PTY session registry: createSession, getSession, killSession, listSessions, registry Map, _clearRegistryForTests
- `tests/session.registry.test.ts` - 15 unit tests covering SESS-01, SESS-02, SESS-04 (createSession, killSession, listSessions)
- `jest.config.ts` - Added transformIgnorePatterns to allow ts-jest transformation of uuid ESM-only package

## Decisions Made

- Registry uses module-level `Map<string, SessionRecord>` — PTY lifetime is owned here, enabling sessions to survive browser close (SESS-02)
- Session records are never deleted from the Map — status transitions to `'exited'` in-place so Phase 2 can inspect exited sessions for reconnect decisions
- `CLAUDE_CONFIG_DIR` set to `/tmp/claude-sessions/{id}` per-session — prevents concurrent sessions from corrupting each other's config and transcript files
- `toListItem()` strips the `pty` field before API responses — `pty.IPty` is not JSON-serializable
- `transformIgnorePatterns` excludes uuid from node_modules ignore pattern — uuid v13 is ESM-only and ts-jest must transform it in CommonJS Jest mode

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pty mock type assertion incompatibility**
- **Found during:** Task 2 (running tests GREEN phase)
- **Issue:** TypeScript rejected `record.pty as ReturnType<typeof makeMockPty>` — the real `node-pty.IPty` type and mock's local `IPty` type have incompatible `onData` signatures (`IEvent<string>` vs `MockedFunction`)
- **Fix:** Changed to `record.pty as unknown as ReturnType<typeof makeMockPty>` (double-cast via unknown)
- **Files modified:** `tests/session.registry.test.ts`
- **Verification:** TypeScript compilation passes, all tests run
- **Committed in:** `8f37dff` (Task 2 feat commit)

**2. [Rule 3 - Blocking] Fixed uuid ESM-only import breaking Jest**
- **Found during:** Task 2 (first GREEN run)
- **Issue:** uuid v13 ships ESM-only (`"type": "module"`); Jest/ts-jest in CommonJS mode can't parse `export { ... }` syntax in node_modules (default transformIgnorePatterns blocks all node_modules)
- **Fix:** Added `transformIgnorePatterns: ['/node_modules/(?!uuid/)']` to jest.config.ts so ts-jest transforms uuid
- **Files modified:** `jest.config.ts`
- **Verification:** Full test suite passes (`npx jest --runInBand` — 21 passing, 11 todos, 4 suites)
- **Committed in:** `8f37dff` (Task 2 feat commit)

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug, 1 Rule 3 blocking)
**Impact on plan:** Both fixes were necessary to make tests run. No scope creep.

## Issues Encountered

- jest.config.ts already existed (created by 01-01) with the correct `moduleNameMapper` for node-pty — no conflict, only needed to add `transformIgnorePatterns` for uuid
- `testPathPattern` option in Jest 30 was replaced by `testPathPatterns` (CLI only); the jest.config.ts key `testPathPattern` would have caused an error if present — confirmed existing config did not have it

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `src/sessions/session.types.ts` and `src/sessions/session.registry.ts` are ready for import by Plan 01-04 (server wiring: POST /sessions, GET /sessions, DELETE /sessions/:id routes)
- Phase 2 (02-session-engine) can attach WebSocket I/O to the `pty` field of `SessionRecord` — the Map is ready, shape is extensible
- All session registry tests pass; no regressions in auth tests

---
*Phase: 01-backend-foundation*
*Completed: 2026-04-01*
