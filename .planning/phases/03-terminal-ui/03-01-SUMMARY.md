---
phase: 03-terminal-ui
plan: 01
subsystem: frontend-scaffold
tags: [frontend, html, css, js, xterm, static-assets]
dependency_graph:
  requires: []
  provides: [public/index.html, public/style.css, public/app.js, express.static mount]
  affects: [03-02, 03-03, 03-04]
tech_stack:
  added: [xterm@5.3.0 (CDN), xterm-addon-fit@0.8.0 (CDN), vanilla JS, CSS]
  patterns: [express.static before requireAuth, localStorage JWT, session record shape with idleTimer]
key_files:
  created: [public/index.html, public/style.css, public/app.js]
  modified: [src/app.ts]
decisions:
  - CDN tags pinned to xterm@5.3.0 and xterm-addon-fit@0.8.0 (exact versions, no floating)
  - Session record shape includes idleTimer field from creation so plan 03-04 needs no structural change
  - express.static mounted before /auth and requireAuth so login page and assets are publicly accessible
  - init() verifies stored JWT via GET /sessions before showing terminal view
metrics:
  duration: ~5m
  completed: 2026-04-02
  tasks: 4
  files: 4
requirements: [TERM-04, TERM-05, TERM-06]
---

# Phase 03 Plan 01: Frontend Scaffold Summary

**One-liner:** Vanilla JS + HTML + CSS public scaffold with xterm@5.3.0 CDN tags, login/terminal views, tab bar, mobile toolbar, and express.static mount before auth.

## What Was Built

- `public/index.html` — complete structural shell: login-view (form + error), terminal-view (tab bar + terminals container + mobile toolbar), new-session-modal, CDN tags pinned to exact xterm versions
- `public/style.css` — responsive styles: reset, login card, tab bar with overflow-x, status dots (running/idle/exited), active/inactive terminal-wrapper, fixed mobile toolbar below 768px, modal overlay
- `public/app.js` — frontend bootstrap: state object, init() with JWT validation, showLogin/showTerminal, clearAuthAndRedirect, apiFetch with 401 handling, login form POST to /auth/login, createTab/switchTab/closeTab/newSession stubs, session record shape with idleTimer
- `src/app.ts` — `import path` added, `express.static(path.join(process.cwd(), 'public'))` mounted before /auth and requireAuth

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create HTML shell and modal structure | 09b2263 | public/index.html |
| 2 | Create baseline responsive styles | 7671540 | public/style.css |
| 3 | Create frontend state and auth/session stubs | 2122287 | public/app.js |
| 4 | Mount static assets before auth middleware | 55ca33b | src/app.ts |

## Verification

- `rg "xterm@5\.3\.0" public/index.html` — 2 matches (CSS and JS CDN tags)
- `rg "xterm-addon-fit@0\.8\.0" public/index.html` — 1 match (fit addon CDN tag)
- `rg "express\.static|requireAuth" src/app.ts` — static on line 25, requireAuth on line 31
- All 45 existing tests pass after src/app.ts change

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- public/index.html: FOUND
- public/style.css: FOUND
- public/app.js: FOUND
- src/app.ts: FOUND
- Commit 09b2263: FOUND (HTML scaffold)
- Commit 7671540: FOUND (stylesheet)
- Commit 2122287: FOUND (app.js)
- Commit 55ca33b: FOUND (express.static mount)
