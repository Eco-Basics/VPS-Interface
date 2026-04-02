---
phase: 03-terminal-ui
plan: 03
subsystem: ui
tags: [xterm.js, FitAddon, vanilla-js, websocket, session-management, tabs]

# Dependency graph
requires:
  - phase: 03-01
    provides: app.js scaffold with state, apiFetch, showLogin/showTerminal stubs, HTML shell
  - phase: 02-session-engine
    provides: GET/POST/DELETE /sessions REST API and WebSocket endpoint
provides:
  - createTab: full xterm.js Terminal + FitAddon instance per session tab
  - switchTab: DOM active/inactive toggling with fitAddon.fit() on activation
  - closeTab: WS close + DELETE /sessions/:id + terminal dispose + DOM removal
  - newSession: modal-driven POST /sessions flow with session-type radio
  - showTerminal: async bootstrap that fetches and renders existing sessions
  - connectWebSocket: stub for plan 03-04 to implement
affects: [03-04, 04-shell-launcher]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - One xterm.js Terminal + FitAddon instance per session record in state.sessions
    - fitAddon.fit() deferred via setTimeout(fn, 0) to run after visibility change
    - Module-level addEventListener calls (not inside DOMContentLoaded) for modal wiring — safe because script tag is at bottom of body

key-files:
  created: []
  modified:
    - public/app.js
    - public/index.html

key-decisions:
  - "HTML IDs corrected: tab-list and terminal-panels (from tab-bar/terminals-container) to match plan code; new-session-cancel (from modal-cancel-btn)"
  - "session-type radio buttons added to modal for bash vs claude session selection"
  - "apiFetch extended to set Content-Type: application/json for string bodies (fixes POST /sessions with pre-stringified JSON)"
  - "init() delegates to showTerminal() which fetches /sessions — removes redundant double-fetch from old init() pattern"
  - "connectWebSocket added as explicit stub so plan 03-04 can implement without changing call sites"

patterns-established:
  - "createTab pattern: Terminal + FitAddon created, DOM built, record pushed to state.sessions, switchTab called immediately"
  - "switchTab pattern: iterate all sessions toggling active/inactive classes, defer fitAddon.fit() via setTimeout"
  - "closeTab pattern: close WS first, DELETE API, dispose terminal, remove DOM, filter state, fallback switchTab"

requirements-completed: [TERM-04, TERM-05]

# Metrics
duration: 5min
completed: 2026-04-02
---

# Phase 03 Plan 03: Tab Management and Session API Integration Summary

**xterm.js tab lifecycle (create/switch/close) wired to REST API with session bootstrap on login**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-02T09:26:00Z
- **Completed:** 2026-04-02T09:31:07Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Full `createTab` implementation: xterm.js Terminal + FitAddon, tab DOM with status dot/label/close button, record pushed to `state.sessions`
- Full `switchTab` implementation: active/inactive class toggling across all tabs, deferred `fitAddon.fit()` on activation
- Full `closeTab` implementation: WS close, DELETE /sessions/:id, terminal dispose, DOM removal, state filter, fallback tab switch
- `newSession` modal flow wired: show modal, cancel closes it, submit POSTs to /sessions with cwd and session-type (claude or bash)
- `showTerminal` upgraded to async: fetches GET /sessions and bootstraps all existing session tabs on login

## Task Commits

Each task was committed atomically:

1. **Tasks 1+2: Tab management and session API integration** - `bd6ad6b` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `public/app.js` - Replaced all tab management stubs with full implementation; rewrote showTerminal as async bootstrap; added connectWebSocket stub; fixed apiFetch Content-Type for string bodies
- `public/index.html` - Corrected element IDs (tab-list, terminal-panels, new-session-cancel); added session-type radio buttons to new session modal

## Decisions Made
- HTML IDs were mismatched between existing scaffold and plan code — corrected the HTML to match plan IDs (`tab-list`, `terminal-panels`, `new-session-cancel`) since plan code is authoritative
- Added session-type radio buttons (claude/bash) to modal — plan code references `input[name="session-type"]` which required HTML support
- Extended `apiFetch` to set `Content-Type: application/json` for string bodies — POST /sessions sends pre-stringified JSON but the old check only triggered for object bodies
- `init()` now delegates session fetching entirely to `showTerminal()` — removes the extra `/sessions` fetch that previously existed in `init()` before calling the old synchronous `showTerminal`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] HTML ID mismatches between scaffold and plan code**
- **Found during:** Task 1 (createTab implementation)
- **Issue:** Plan code referenced `tab-list`, `terminal-panels`, `new-session-cancel` but HTML had `tab-bar`, `terminals-container`, `modal-cancel-btn` — would silently fail at runtime
- **Fix:** Updated `index.html` to use matching IDs; added `tab-list` as inner div inside tab-bar; renamed terminal panels container and modal cancel button
- **Files modified:** public/index.html
- **Verification:** IDs match exactly what createTab/switchTab/closeTab/newSession reference in app.js
- **Committed in:** bd6ad6b

**2. [Rule 2 - Missing Critical] Session-type radio buttons absent from modal**
- **Found during:** Task 2 (new-session-form submit handler)
- **Issue:** Plan code uses `document.querySelector('input[name="session-type"]:checked')?.value` but HTML had no radio buttons — would return undefined for shellType, defaulting all sessions to claude
- **Fix:** Added session-type fieldset with claude (default) and bash radio buttons to modal
- **Files modified:** public/index.html
- **Verification:** Radio buttons present with correct name attribute
- **Committed in:** bd6ad6b

**3. [Rule 1 - Bug] apiFetch did not set Content-Type for pre-stringified JSON bodies**
- **Found during:** Task 2 (POST /sessions form submit)
- **Issue:** New session form submits `body: JSON.stringify(body)` (string), but apiFetch only set Content-Type for `typeof body === 'object'` — backend would not receive correct content type header
- **Fix:** Extended apiFetch condition to also set `Content-Type: application/json` when body is a string and no Content-Type already set
- **Files modified:** public/app.js
- **Verification:** apiFetch correctly sets header for both object and string bodies
- **Committed in:** bd6ad6b

---

**Total deviations:** 3 auto-fixed (2 Rule 1 bugs, 1 Rule 2 missing critical)
**Impact on plan:** All fixes required for correct runtime behavior. No scope creep.

## Issues Encountered
- DOMContentLoaded block had duplicate modal-cancel and new-session-form handlers that conflicted with plan's module-level addEventListener calls — removed duplicates from DOMContentLoaded, keeping only login form wiring there

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Tab creation, switching, and closing are fully wired to the session REST API
- `connectWebSocket(record)` stub is in place — plan 03-04 implements it
- `showTerminal` bootstraps existing sessions on login — WebSocket connections per session will be established in 03-04
- No blockers for 03-04

---
*Phase: 03-terminal-ui*
*Completed: 2026-04-02*
