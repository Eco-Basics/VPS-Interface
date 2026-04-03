---
status: complete
phase: 04-shell-launcher
source: [04-01-PLAN.md, 04-02-PLAN.md, 03-VERIFICATION.md]
started: 2026-04-03T00:00:00Z
updated: 2026-04-03T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Invalid command blocked
expected: POST /sessions with an invalid command (e.g. "rm -rf /") returns 400 with an error message. Automated test suite (npm test) confirms this.
result: pass

### 2. bash session starts
expected: POST /sessions with { cwd, command: "bash" } returns 201 and a session record. A bash shell becomes reachable via WebSocket.
result: pass

### 3. Omitted command is backwards-compatible
expected: POST /sessions with no command field returns 201 and launches the Claude command exactly as before. Existing sessions are unaffected.
result: pass

### 4. Save directory checkbox persists
expected: In the New Session modal, check "Save directory", enter a working directory path, and submit. Reopen the modal — the directory appears in the saved-dirs list below the form.
result: pass

### 5. Launch from saved directory
expected: With a saved directory in the list, click its "Launch" button. A new session tab opens using that directory without having to retype the path.
result: issue
reported: "Clicking Launch fills the working directory field but still requires user to click Start Session. Button label 'Launch' is misleading — should reflect that it only prefills, not auto-starts."
severity: cosmetic

### 6. Remove saved directory
expected: Click "Remove" next to a saved directory. It disappears from the list immediately and does not reappear after closing and reopening the modal.
result: pass

### 7. Bash tab defaults to "Shell" label
expected: Start a new session with command=bash (using the shell radio in the modal or direct API call). The tab in the tab bar shows "Shell" instead of "Session N".
result: pass
note: Fixed to auto-number — bash tabs show "Shell 1", "Shell 2"; Claude tabs show "Session 1", "Session 2".

### 8. Inline tab rename — Enter commits
expected: Double-click a tab label. It becomes editable (text selected). Type a new name and press Enter. The tab now shows the new name.
result: skipped
reason: User prefers auto-numbering (Shell 1, Shell 2 / Session 1, Session 2) over inline rename feature.

### 9. Inline tab rename — Escape reverts
expected: Double-click a tab label, type something, then press Escape. The label reverts to its original name.
result: skipped
reason: Inline rename not wanted — auto-numbering approach preferred.

### 10. [Ph03] Login page renders
expected: Navigate to the app root in a browser. The login card is centered, password field and Sign In button are visible, no console errors.
result: pass
note: Two non-blocking console items — (1) Edge Tracking Prevention warns on CDN storage access for xterm; xterm still loads and functions correctly. (2) favicon.ico returns 401 — no favicon in public/ so the request falls through auth middleware.

### 11. [Ph03] Tab create / switch / close lifecycle
expected: Log in, click "+ New Session", fill in a working directory, start a Claude session. Repeat for a second session. Two tabs appear with status dots. Switching between them shows independent terminal panels. Closing a tab removes it from the bar.
result: pass

### 12. [Ph03] Idle status timer
expected: Open a session and let it sit with no output for 5 seconds. The status dot transitions from green (running) to yellow (idle). Producing output turns it green again. Session exit turns it red permanently.
result: pass
note: Dot colours updated per user preference — idle=red (input required), exited=grey.

### 13. [Ph03] Mobile layout
expected: Open the app with viewport width ≤ 375px (devtools or real device). Tab bar is horizontally scrollable. Terminal fills space above the toolbar. Mobile toolbar is fixed at the bottom showing all 6 buttons (Ctrl+C, Esc, Tab, Up, Down, Keyboard).
result: pass

### 14. [Ph03] Mobile Ctrl+C delivers signal
expected: With an active session, tap the "Ctrl+C" button in the mobile toolbar. The terminal receives the interrupt (^C shown or process interrupted), same as pressing Ctrl+C on a physical keyboard.
result: pass
note: Signal delivered — bash exited with code 0 on idle prompt (expected). Closing a tab (DELETE /sessions/:id) cleanly kills the backend PTY via killSession(); no background leaks.

## Summary

total: 14
passed: 11
issues: 1
pending: 0
skipped: 2

## Gaps

- truth: "Launch button from saved dirs opens a session without additional user action"
  status: failed
  reason: "User reported: clicking Launch fills the working directory field but still requires user to click Start Session. Button label 'Launch' is misleading — should reflect that it only prefills, not auto-starts."
  severity: cosmetic
  test: 5
