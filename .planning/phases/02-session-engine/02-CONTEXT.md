# Phase 2: Session Engine - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

WebSocket bridge between the browser and PTY sessions, ring buffer for scrollback replay, and a session management REST API (list, kill). Sessions become fully persistent across browser disconnects and reconnectable with output replay. All endpoints remain JWT-protected.

Covers: SESS-03, SESS-05, TERM-01, TERM-02, TERM-03

</domain>

<decisions>
## Implementation Decisions

### Ring Buffer
- In-memory circular buffer per session, capped at 1000 lines
- No disk persistence — acceptable to lose scrollback on server restart (consistent with Phase 1 in-memory-only stance)
- Buffer accumulates PTY output from spawn time; cleared when session is explicitly deleted (DELETE /sessions/:id)
- Ring buffer is part of the SessionRecord (Phase 1 registry owns it, Phase 2 populates it)

### WebSocket Message Protocol
- **Server → client**: Raw UTF-8 string for PTY output data (passed directly to xterm.js Terminal.write())
- **Client → server**: JSON envelope for all client messages — input keystrokes AND control messages
  - `{"type":"input","data":"..."}` — keystroke/text input to write to PTY
  - `{"type":"resize","cols":80,"rows":24}` — terminal resize event
  - `{"type":"ping"}` — keepalive (server responds with `{"type":"pong"}`)
- Rationale: xterm.js onData callback already gives raw strings; JSON control messages are clean and debuggable
- No binary framing — all client→server messages are JSON; all server→client PTY data is plain string

### Reconnect Behavior
- On WebSocket connect to an existing session: server immediately sends full ring buffer contents as a single string chunk, then switches to live streaming
- No special framing for replay vs live — client (xterm.js) treats it identically; content is already correct terminal output
- Multiple simultaneous WebSocket connections to the same session are allowed (e.g., two browser tabs) — all receive the same live output

### Terminal Resize (SIGWINCH)
- Client sends `{"type":"resize","cols":N,"rows":M}` when xterm.js FitAddon fires a resize event
- Server calls `pty.resize(cols, rows)` — node-pty handles SIGWINCH propagation to Claude
- No debounce required server-side; xterm.js FitAddon fires sparingly

### Session Kill (SESS-05)
- SIGTERM → SIGKILL fallback already implemented in Phase 1 registry's killSession()
- Phase 2 adds: WebSocket connections to a killed session receive `{"type":"exit","exitCode":N}` message, then the server closes the WebSocket
- REST endpoint: DELETE /sessions/:id (already scaffolded in Phase 1) — no changes needed, just wire the WebSocket notification

### WebSocket Auth
- Phase 1 already rejects unauthenticated WS upgrades with 401
- Phase 2 replaces the 501 stub with wss.handleUpgrade() for authenticated connections
- Session ID passed in WebSocket URL: `ws://host/sessions/:id/ws?token=<jwt>`
- Server validates session exists before completing upgrade; returns 404-equivalent if not

### Claude's Discretion
- WebSocket ping/pong interval timing (suggest 30s)
- Exact ring buffer data structure (circular array vs. simple push/shift)
- Error response format for WS protocol violations (malformed JSON, unknown message type)
- Whether to log PTY output for debugging (suggest off by default, env var to enable)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — SESS-03, SESS-05, TERM-01, TERM-02, TERM-03 acceptance criteria
- `.planning/PROJECT.md` — Stack constraints (ws library, not socket.io; vanilla JS frontend; xterm.js)

### Prior Phase
- `.planning/phases/01-backend-foundation/01-CONTEXT.md` — SessionRecord shape, registry API, auth middleware pattern, JWT query param for WebSocket
- `.planning/phases/01-backend-foundation/01-04-PLAN.md` — attachWebSocketAuth() stub that Phase 2 replaces with wss.handleUpgrade()

### No external specs
No ADRs or feature docs beyond PROJECT.md and REQUIREMENTS.md — all constraints captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/sessions/session.registry.ts` — createSession, getSession, killSession, listSessions; Phase 2 extends SessionRecord to include ring buffer
- `src/sessions/session.types.ts` — SessionRecord interface; needs `buffer: string[]` field added
- `src/ws/ws.upgrade.ts` — attachWebSocketAuth() returns 501 for valid auth; Phase 2 replaces that branch with wss.handleUpgrade()
- `src/auth/auth.middleware.ts` — requireAuth middleware; Phase 2 WebSocket auth reuses same jwt.verify pattern

### Established Patterns
- JWT passed as `?token=` query param for WebSocket (locked in Phase 1 — browser WebSocket API cannot set custom headers)
- Error envelope: `{ error: "string" }` for HTTP; `{"type":"error","message":"string"}` for WebSocket
- In-memory storage only — no database, no file I/O for session state
- createApp() factory pattern — no module-level side effects; Phase 2 follows same factory approach for WS server

### Integration Points
- Phase 2 attaches `ws.Server` to the same `http.Server` created in server.ts
- session.registry.ts `onExit` callback: Phase 2 registers a second onExit handler to notify WebSocket clients
- Phase 3 (browser terminal) will connect xterm.js to the WebSocket endpoint built here

</code_context>

<specifics>
## Specific Ideas

- WS URL pattern: `ws://host/sessions/:id/ws?token=<jwt>` — clean, RESTful, session-scoped
- Ring buffer replay should be transparent to xterm.js — just a string write, same as live data
- Multiple browser tabs connected to same session should all see the same output (broadcast)

</specifics>

<deferred>
## Deferred Ideas

- Ring buffer persistence across server restarts — v2 RESIL-01 (intentionally out of v1 scope)
- Session recording/playback — v2 UI-02
- Binary framing for PTY data (performance optimization for large output) — not needed for v1

</deferred>

---

*Phase: 02-session-engine*
*Context gathered: 2026-04-01*
