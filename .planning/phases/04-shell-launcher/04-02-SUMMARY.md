---
phase: 04-shell-launcher
plan: 02
completed: 2026-04-03
commit: 640247c
one_liner: "Added saved project directories, auto-numbered Shell/Session tabs, status dot redesign (green/red/grey), and bash modal integration to the frontend"
---

# Phase 04-02 Summary: Shell Launcher Frontend

## What Was Built

Completed the shell launcher experience with saved directories, tab auto-numbering, and refined status indicators.

### Files Modified

- `public/index.html` — Added `save-dir-checkbox` and `saved-dirs-list` container to new-session modal
- `public/style.css` — Added `.saved-dir-item`, `.launch-dir-btn`, `.remove-dir-btn` styles; updated status dot colours (green=running, red=input required, grey=exited)
- `public/app.js` — Added `loadSavedDirs`, `saveDirToStorage`, `removeSavedDir`, `renderSavedDirs`; save-on-submit integration; launch/remove event delegation on saved-dirs list; bash tabs auto-number as "Shell N", Claude tabs as "Session N"; separate `nextShellNumber` counter in state
- `package.json` — Fixed `start` script path from `dist/server.js` → `dist/src/server.js`

### Key Decisions

- Auto-numbering ("Shell 1", "Shell 2") preferred over inline rename — simpler UX, no double-click interaction required
- Status dot semantics: red = input required (idle), grey = exited; clearer than yellow/red original design
- "Use" button label (was "Launch") — prefills cwd field rather than auto-starting, so label should match behaviour

## Verification

UAT completed 2026-04-03. 11/14 tests passed, 1 cosmetic issue fixed during testing (button label), 2 skipped (inline rename replaced by auto-numbering). All Phase 03 browser tests also verified in same session.

## Requirements Satisfied

- SHLL-01: Bash shell tab via PTY infrastructure — ✓
- SHLL-02: Saved project directories with one-click prefill — ✓
- SHLL-03: Auto-numbered session labels (Shell N / Session N) — ✓ (adapted from custom rename)
