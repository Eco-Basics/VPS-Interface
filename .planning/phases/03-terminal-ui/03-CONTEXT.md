# Phase 3: Terminal UI - Context

**Gathered:** 2026-04-01 (updated 2026-04-01 — idle timer and CDN pinning locked in)
**Status:** Ready for planning

<domain>
## Phase Boundary

A vanilla JS + HTML browser frontend that: (1) shows a login page, (2) lets users create and switch session tabs, (3) renders each session's terminal using xterm.js connected to the Phase 2 WebSocket, (4) works on both mobile and desktop. No build pipeline — served as static files from the Node.js backend.

Covers: TERM-04, TERM-05, TERM-06

</domain>

<decisions>
## Implementation Decisions

### Tech Stack
- Vanilla JS + HTML + CSS — no React, no Vue, no build step (locked in PROJECT.md)
- xterm.js loaded via CDN — **pin to xterm@5.3.0 and xterm-addon-fit@0.8.0** (avoid silent breaking changes from CDN floating version)
- ws library (Phase 2) handles the WebSocket; frontend uses native browser WebSocket API
- CSS: hand-written, no Tailwind or framework — keep it small

### Login Page
- Single centered card: app title, password input, submit button
- On success: JWT stored in `localStorage` key `"vps_jwt"`, redirect to terminal view
- On failure: inline error message ("Wrong password"), input cleared
- Auto-redirect to terminal view if valid JWT already in localStorage on page load
- No "remember me" toggle — JWT is always stored (7-day expiry is acceptable)

### Tab Bar
- Horizontal tab bar at top of screen
- Each tab shows: session label (custom name if set, else "Session N"), status dot (🟢 running / 🟡 idle / 🔴 exited), close button (×)
- "New Session" button at end of tab bar — opens a modal to enter working directory
- Switching tabs: hides current xterm.js terminal div, shows selected one (DOM-based, not recreated)
- Close tab: calls DELETE /sessions/:id, removes tab from DOM, disposes xterm.js Terminal instance
- Tab order: insertion order, no drag-to-reorder in v1

### Terminal Rendering
- One xterm.js `Terminal` instance per tab, attached to its own `<div class="terminal-container">`
- `FitAddon` loaded alongside xterm.js — called on window resize and on tab switch
- `terminal.writeln()` / `terminal.write()` for incoming WS data (raw UTF-8 string from server)
- `terminal.onData((data) => ws.send(JSON.stringify({type:"input",data})))` for keystroke forwarding
- Terminal background: black (#000000); default xterm.js theme otherwise
- On WS `{"type":"exit"}` message: set tab status to exited, show inline banner "Session exited" in terminal

### Mobile Layout
- Tab bar scrolls horizontally if tabs overflow (CSS `overflow-x: auto`)
- Terminal fills remaining viewport height (CSS `calc(100vh - tabBarHeight - mobileToolbarHeight)`)
- Mobile toolbar: fixed at bottom, 6 buttons — Ctrl+C, Esc, Tab, ↑, ↓, keyboard toggle
- Keyboard toggle button shows/hides the native mobile keyboard (focuses/blurs the xterm.js terminal textarea)
- Desktop: mobile toolbar hidden via `@media (min-width: 768px)`
- Viewport meta tag: `<meta name="viewport" content="width=device-width, initial-scale=1">` to prevent zoom

### New Session Modal
- Simple modal overlay: "Working Directory" text input, "Start Session" button, Cancel
- On submit: POST /sessions with `{cwd}`, create new tab, open WS connection to new session
- Error handling: show inline error if POST fails (e.g., invalid cwd)

### Session Status Indicators (TERM-05)
- Status stored per-tab in JS state object `{id, label, status: 'running'|'idle'|'exited', ws, terminal, idleTimer}`
- Status updated on three events:
  1. **PTY data received** → cancel existing idle timer, set status to `'running'`, start new 5 000ms timer
  2. **5 000ms idle timer fires** → set status to `'idle'` (no data received in last 5 seconds)
  3. **WS `{"type":"exit"}` message** → cancel idle timer, set status to `'exited'`
- Implementation: `clearTimeout(session.idleTimer)` on every WS message, then `session.idleTimer = setTimeout(() => setStatus('idle'), 5000)`
- Timer is cancelled and not restarted when status is already `'exited'`
- This is a **locked decision** — planner must include idle timer implementation as an explicit task in plan 03-04

### Authentication in Frontend
- All API calls include `Authorization: Bearer <token>` header from localStorage
- WS connections: `new WebSocket(url + '?token=' + token)`
- On any 401 response: clear localStorage, redirect to login page
- JWT expiry: not checked client-side; server rejects expired tokens with 401 (handled by above)

### Claude's Discretion
- Exact CSS styling, colors beyond terminal background
- New session modal animation
- Tab overflow indicator ("+ N more" badge) if needed
- Favicon
- Idle timer threshold can be adjusted (5 000ms is the default; Claude may tune if it proves too sensitive)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — TERM-04, TERM-05, TERM-06 acceptance criteria
- `.planning/PROJECT.md` — Stack constraints (vanilla JS, xterm.js, no build pipeline, Caddy serves static files)

### Prior Phases
- `.planning/phases/02-session-engine/02-CONTEXT.md` — WS protocol (JSON input/resize, raw string PTY data, exit notification format)
- `.planning/phases/01-backend-foundation/01-CONTEXT.md` — Auth pattern (JWT in Authorization header, login endpoint shape)

### No external specs
No ADRs or feature docs beyond PROJECT.md and REQUIREMENTS.md.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app.ts` (createApp) — Phase 3 adds static file serving middleware for the frontend
- `src/auth/auth.router.ts` — POST /auth/login returns `{ token }` — frontend consumes this
- Phase 2 WS URL pattern: `ws://host/sessions/:id/ws?token=<jwt>`

### Established Patterns
- Error envelope: `{ error: "string" }` for HTTP — frontend checks `res.body.error`
- JWT in Authorization header for HTTP; ?token= query param for WebSocket

### Integration Points
- Backend serves static files from `public/` directory (Phase 3 creates this directory)
- Frontend WebSocket connects to Phase 2's `/sessions/:id/ws` endpoint
- POST /auth/login, GET /sessions, POST /sessions, DELETE /sessions/:id all used by frontend

</code_context>

<specifics>
## Specific Ideas

- Terminal should feel like a real terminal — black background, monospace font, no decorative chrome
- Tab bar should not take up much vertical space — keep it compact (single line, ~40px height)
- Mobile toolbar at bottom ensures it doesn't interfere with terminal content

</specifics>

<deferred>
## Deferred Ideas

- Split-pane view (two terminals side by side) — v2 UI-01
- Session search/filter in tab bar — not needed for small session counts
- Drag-to-reorder tabs — v2
- Custom themes beyond black background — not requested

</deferred>

---

*Phase: 03-terminal-ui*
*Context gathered: 2026-04-01*
