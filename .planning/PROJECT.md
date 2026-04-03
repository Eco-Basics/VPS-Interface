# Claude VPS Interface

## What This Is

A browser-based interface for managing Claude Code sessions running on a remote VPS. Access Claude Code sessions from any device (phone, tablet, desktop) without a local machine or SSH client — full terminal interactivity, multi-session tabs, bash shell access, and saved project directories.

## Core Value

Full Claude Code interactivity from any device, anywhere — spawn sessions in project directories, answer every prompt, run tests, and manage work without ever opening a terminal locally.

## Requirements

### Validated

- ✓ User can log in with a password from any browser — v1.0
- ✓ User session token persists across browser refresh (JWT stored client-side) — v1.0
- ✓ All HTTP endpoints and WebSocket connections require a valid JWT — v1.0
- ✓ User can spawn a Claude Code session in a specified VPS directory — v1.0
- ✓ Session survives browser close — Claude process keeps running server-side — v1.0
- ✓ User can reconnect to a running session and see recent output (scrollback replay) — v1.0
- ✓ User can run multiple concurrent sessions simultaneously — v1.0
- ✓ User can kill/close a session with graceful shutdown (SIGTERM before SIGKILL) — v1.0
- ✓ Terminal renders full ANSI color and formatting via xterm.js — v1.0
- ✓ All Claude interactive prompts work correctly (approve/deny, diffs, menus, slash commands) — v1.0
- ✓ Terminal resizes correctly when browser window or viewport changes (SIGWINCH propagated) — v1.0
- ✓ User can manage sessions via tabs (create, switch, close) — v1.0
- ✓ Each tab shows session status (running / idle / exited) — v1.0
- ✓ Interface is usable on mobile and desktop (responsive layout) — v1.0
- ✓ User can open a bash shell tab using the same PTY infrastructure as Claude sessions — v1.0
- ✓ User can save project directories and quick-launch sessions from a list — v1.0
- ✓ User can name/label sessions for clarity (auto-numbered Shell N / Session N) — v1.0

### Active

- [ ] Split-pane view — two sessions side by side (UI-01)
- [ ] Session recording and playback (UI-02)
- [ ] Session registry survives server restart (RESIL-01)
- [ ] Session TTL/idle-timeout with auto-cleanup (RESIL-02)

### Out of Scope

- File uploads/downloads (SCP/SFTP) — files live on VPS; use git or curl for transfers
- Multi-user access — single personal-use interface, one set of credentials
- Built-in code editor or file browser — Claude handles file work, shell tab for inspection
- Full SSH administration panel — light shell only, not a VPS management tool
- Native desktop app — web browser is sufficient, simpler to build and maintain
- Plugin/extension system — over-engineering for personal tool
- Read-only sharing / public session URLs — security risk; not needed

## Context

**Shipped v1.0** — 2026-04-03
4 phases, 14 plans, ~1,200 LOC TypeScript + vanilla JS
Tech stack: Node.js, Express, node-pty, ws, xterm.js (CDN), JWT, TypeScript

Deployed target: VPS with Caddy reverse proxy (HTTPS auto via Let's Encrypt)

Known issues / tech debt:
- `npm start` path was wrong (fixed: `dist/src/server.js`)
- No favicon — GET /favicon.ico falls through to 401 (cosmetic, drop a `.ico` in `public/`)
- CDN xterm.js triggers Edge Tracking Prevention warnings (non-blocking; consider bundling locally in v1.1)
- Inline tab rename was removed in favour of auto-numbering — may revisit if users want custom names

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Browser-based (not desktop app) | Device-agnostic, no install, simpler deployment | ✓ Good |
| PTY-based sessions (not pipe-based) | Required for full Claude interactive prompt compatibility | ✓ Good — all prompts work |
| Backend runs on VPS | Sessions are local to where Claude runs; no latency hop | ✓ Good |
| JWT auth (not static password) | Standard, revocable, auditable sessions | ✓ Good |
| xterm.js for rendering | Same engine as VS Code terminal; handles all ANSI; mobile-compatible | ✓ Good |
| Vanilla JS frontend (not React/Vue) | No build pipeline; simpler deployment; UI scope is small | ✓ Good — manageable at 400 LOC |
| ws library (not socket.io) | Raw WebSocket sufficient; socket.io abstractions unneeded; smaller bundle | ✓ Good |
| Caddy reverse proxy (not nginx) | Auto-HTTPS via Let's Encrypt with zero config | — Pending deployment |
| ALLOWED_COMMANDS allowlist for bash | Security: explicit opt-in, not denylist | ✓ Good |
| Auto-numbered tabs (not inline rename) | Simpler UX; rename adds double-click interaction with no clear affordance | ✓ Good — user preferred |
| Status dots: green/red/grey | red=input required, grey=exited — clearer than yellow | ✓ Good — validated in UAT |

## Constraints

- **Stack**: Node.js backend (node-pty, WebSocket); vanilla JS frontend with xterm.js
- **Deployment**: Backend runs as persistent process on VPS (pm2 or systemd); HTTPS via Caddy
- **Security**: Password login → JWT; HTTPS required; no unauthenticated access
- **Compatibility**: All Claude Code interactive prompt types must work — real PTY, not a pipe

---
*Last updated: 2026-04-03 after v1.0 milestone shipped*
