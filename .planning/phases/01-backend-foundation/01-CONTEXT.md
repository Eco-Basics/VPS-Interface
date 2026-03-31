# Phase 1: Backend Foundation - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

A secured Node.js HTTP server that can spawn PTY processes and track them in an in-memory session registry. Auth-protected via JWT. Testable via curl. No browser UI in this phase — backend only.

Covers: AUTH-01, AUTH-02, AUTH-03, SESS-01, SESS-02, SESS-04

</domain>

<decisions>
## Implementation Decisions

### Authentication
- Single password login — password stored as bcrypt hash at server startup via `PASSWORD` env var (no config file to accidentally commit)
- JWT issued on successful login; 7-day expiry (personal tool, monthly re-auth would be disruptive)
- No refresh tokens — single JWT, re-login on expiry
- All HTTP endpoints and WebSocket upgrades require valid JWT (validated via `Authorization: Bearer <token>` header or `?token=` query param for WebSocket)
- JWT secret stored in `JWT_SECRET` env var

### Session Identity & Registry
- Session ID: UUID v4 (standard, collision-free)
- Registry: in-memory `Map<sessionId, SessionRecord>` — intentionally in-memory for v1 (SESS-02 requires process survives browser close, not server restart; that's v2/RESIL-01)
- SessionRecord shape: `{ id, pid, pty, cwd, createdAt, status: 'running' | 'exited' }`

### PTY Spawn Configuration
- Command: `claude` (assumes on PATH); configurable via `CLAUDE_CMD` env var for non-standard installs
- Default terminal dimensions: 80 cols × 24 rows; updated via resize endpoint
- PTY spawned with the server process's environment (inherits PATH, HOME, etc.)
- Working directory: provided by the API caller (required field — no default)

### API Surface (Phase 1 scope)
- `POST /auth/login` — returns JWT
- `POST /sessions` — spawns PTY, returns session ID
- `GET /sessions` — lists active sessions
- `DELETE /sessions/:id` — kills session (SIGTERM → SIGKILL after 5s)
- WebSocket upgrade auth check (actual WS bridge is Phase 2 — Phase 1 just rejects unauthenticated upgrades)

### Claude's Discretion
- Exact bcrypt cost factor (recommend 12)
- HTTP server framework choice (Express recommended — well-understood, minimal)
- Session list response shape beyond required fields
- Error response envelope format
- Logging verbosity

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — AUTH-01–03, SESS-01, SESS-02, SESS-04 acceptance criteria
- `.planning/PROJECT.md` — Stack constraints (node-pty, ws, vanilla JS frontend, Caddy reverse proxy), security requirements

### No external specs
No ADRs or feature docs beyond PROJECT.md and REQUIREMENTS.md — all constraints captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing codebase

### Established Patterns
- None yet — this phase establishes the patterns

### Integration Points
- Phase 2 will attach WebSocket session bridge to sessions created here
- Phase 2 expects `SessionRecord` to include the `pty` object for piping I/O

</code_context>

<specifics>
## Specific Ideas

- "Testable via curl" — Phase 1 deliverable means the full auth + spawn + list + kill flow must work from curl without a browser
- PTY must be a real pseudo-terminal (node-pty), not a pipe — required for Claude interactive prompts (diffs, approve/deny, menus) per PROJECT.md constraints
- JWT stored client-side in localStorage (set by browser in Phase 3 — for now, just confirm the token works in curl headers)

</specifics>

<deferred>
## Deferred Ideas

- Session registry persistence across server restarts — v2 RESIL-01 (intentionally out of v1 scope)
- Session TTL / idle timeout — v2 RESIL-02
- HTTPS termination — handled by Caddy reverse proxy (infrastructure concern, not backend code)

</deferred>

---

*Phase: 01-backend-foundation*
*Context gathered: 2026-03-31*
