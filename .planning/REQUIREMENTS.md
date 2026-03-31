# Requirements: Claude VPS Interface

**Defined:** 2026-03-31
**Core Value:** Full Claude Code interactivity from any device, anywhere — spawn sessions in project directories, answer every prompt, run tests, and manage work without ever opening a terminal locally.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can log in with a password from any browser
- [ ] **AUTH-02**: User session token persists across browser refresh (JWT stored client-side)
- [ ] **AUTH-03**: All HTTP endpoints and WebSocket connections require a valid JWT

### PTY & Sessions

- [ ] **SESS-01**: User can spawn a Claude Code session in a specified VPS directory
- [ ] **SESS-02**: Session survives browser close — Claude process keeps running server-side
- [ ] **SESS-03**: User can reconnect to a running session and see recent output (scrollback replay via ring buffer)
- [ ] **SESS-04**: User can run multiple concurrent sessions simultaneously
- [ ] **SESS-05**: User can kill/close a session with graceful shutdown (SIGTERM before SIGKILL)

### Terminal UI

- [ ] **TERM-01**: Terminal renders full ANSI color and formatting via xterm.js
- [ ] **TERM-02**: All Claude interactive prompts work correctly (approve/deny, diffs, menus, slash commands)
- [ ] **TERM-03**: Terminal resizes correctly when browser window or viewport changes (SIGWINCH propagated)
- [ ] **TERM-04**: User can manage sessions via tabs (create, switch, close)
- [ ] **TERM-05**: Each tab shows session status (running / idle / exited)
- [ ] **TERM-06**: Interface is usable on mobile and desktop (responsive layout)

### Shell & Launcher

- [ ] **SHLL-01**: User can open a bash shell tab using the same PTY infrastructure as Claude sessions
- [ ] **SHLL-02**: User can save project directories and quick-launch sessions from a list
- [ ] **SHLL-03**: User can name/label sessions for clarity

## v2 Requirements

### Advanced UI

- **UI-01**: Split-pane view — two sessions side by side
- **UI-02**: Session recording and playback

### Resilience

- **RESIL-01**: Session registry survives server restart (persist PIDs, re-adopt on startup)
- **RESIL-02**: Session TTL/idle-timeout with auto-cleanup of abandoned sessions

## Out of Scope

| Feature | Reason |
|---------|--------|
| File uploads/downloads (SCP/SFTP) | Files live on VPS; use git or curl for transfers |
| Multi-user / team access | Personal tool; single credential set |
| Built-in code editor or file browser | Claude handles file work; shell tab for inspection |
| Full SSH administration panel | Light shell only; not a VPS management tool |
| Native desktop app | Web browser is sufficient; device-agnostic; simpler to maintain |
| Session recording/playback | Not requested; adds storage complexity; v2+ |
| Plugin/extension system | Over-engineering for personal tool |
| Read-only sharing / public session URLs | Security risk; not needed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | — | Pending |
| AUTH-02 | — | Pending |
| AUTH-03 | — | Pending |
| SESS-01 | — | Pending |
| SESS-02 | — | Pending |
| SESS-03 | — | Pending |
| SESS-04 | — | Pending |
| SESS-05 | — | Pending |
| TERM-01 | — | Pending |
| TERM-02 | — | Pending |
| TERM-03 | — | Pending |
| TERM-04 | — | Pending |
| TERM-05 | — | Pending |
| TERM-06 | — | Pending |
| SHLL-01 | — | Pending |
| SHLL-02 | — | Pending |
| SHLL-03 | — | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 17 ⚠️

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after initial definition*
