---
phase: 03-terminal-ui
plan: "04"
subsystem: frontend
tags: [websocket, xterm, resize, idle-timer, mobile]
dependency_graph:
  requires: [03-02, 03-03, 02-04]
  provides: [live-terminal-io, resize-propagation, idle-status, mobile-controls]
  affects: [public/app.js]
tech_stack:
  added: []
  patterns: [websocket-per-tab, debounced-resize, clearTimeout-idle-cycle, event-delegation]
key_files:
  created: []
  modified:
    - public/app.js
decisions:
  - WS stub replaced with full connectWebSocket; idle timer woven directly into onmessage handler rather than as a separate step
  - Task 3 (idle timer) implemented inline during Task 1 since they modify the same onmessage handler — no separate commit needed
  - resizeTimer scoped at module level (not inside connectWebSocket) so only one global debounce runs regardless of session count
  - Mobile toolbar uses event delegation rather than per-button listeners — cheaper and handles dynamically added buttons
metrics:
  duration: ~4m
  completed_date: "2026-04-02"
  tasks_completed: 4
  files_modified: 1
---

# Phase 03 Plan 04: WebSocket Wiring, Resize, Idle Timer, and Mobile Toolbar Summary

WebSocket bridge wired to xterm.js terminals with per-tab idle status tracking, debounced resize propagation, and mobile control sequences via event delegation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement connectWebSocket and status updates | 5b86efd | public/app.js |
| 2 | Add debounced resize propagation | 8743f67 | public/app.js |
| 3 | Implement per-tab idle status timer (TERM-05) | 5b86efd | public/app.js (inline with Task 1) |
| 4 | Add mobile toolbar event delegation | 20a9916 | public/app.js |

## What Was Built

### Task 1 + 3: connectWebSocket and idle timer

`updateTabStatus(sessionId, status)` updates the session record's `.status` field and toggles the CSS class on the `.status-dot` element in the tab button.

`connectWebSocket(session)` establishes a WebSocket connection with:
- Protocol detection: `ws:` for http, `wss:` for https
- Auth token in query string: `/sessions/{id}/ws?token={jwt}`
- `onopen`: marks tab running, calls `fitAddon.fit()`, sends initial resize message
- `onmessage`: JSON-parses with try/catch; `output` branch writes PTY data and manages 5000ms idle timer; `exit` branch writes exit banner and clears timer permanently; raw-string catch branch handles non-JSON PTY data
- `onclose`: transitions to `idle` unless already `exited`
- `terminal.onData`: forwards keystrokes as `{ type: 'input', data }`

Idle timer cycle: `clearTimeout` → `terminal.write` → `updateTabStatus('running')` → `setTimeout(..., 5000)` on every PTY data event. Exit branch: `clearTimeout`, set `null`, never restart.

### Task 2: Debounced resize

Module-level `resizeTimer` with 100ms debounce on `window.resize`. On fire: `fitAddon.fit()` then sends `{ type: 'resize', cols, rows }` if WS is open.

### Task 4: Mobile toolbar

Single delegated listener on `#mobile-toolbar`. Uses `event.target.closest('[data-key]')` to find button. Sequences map: `ctrl-c → \x03`, `esc → \x1b`, `tab → \t`, `up → \x1b[A`, `down → \x1b[B`. `keyboard` key focuses `terminal.textarea` for soft keyboard. All sequences sent as `{ type: 'input', data }`.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

**Note on Task 3 sequencing:** Task 3 described adding idle timer logic to the `onmessage` handler created in Task 1. Since both tasks modify the same code block, the idle timer was woven in during Task 1's implementation to avoid writing incorrect intermediate code. The final result is identical to what Task 3 specified. No separate commit was needed for Task 3 as no additional code changes were required.

## Success Criteria Verification

- [x] WS connection established per tab with auth token in query string
- [x] PTY output and input wired to xterm.js terminal instance
- [x] Resize events propagate to active PTY with 100ms debounce
- [x] Per-tab idle timer fires after 5000ms of no PTY data, sets tab to `idle`
- [x] Idle timer cancelled and not restarted when tab is `exited`
- [x] Mobile toolbar buttons send correct control sequences to active session

## Self-Check: PASSED
