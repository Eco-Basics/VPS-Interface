# Roadmap: Claude VPS Interface

## Overview

Four phases build this system from the inside out. Phase 1 establishes a secured backend with PTY spawning and session registry — nothing the user can see yet, but the foundation everything else requires. Phase 2 wires the WebSocket bridge, ring buffer, and session management API, making sessions fully persistent and reconnectable from the command line. Phase 3 adds the browser UI — xterm.js terminal rendering, tab management, and responsive layout — turning the backend into a usable product. Phase 4 completes the experience with bash shell tabs, saved project directories, and session naming.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Backend Foundation** - Auth, PTY spawning, and in-memory session registry
- [ ] **Phase 2: Session Engine** - WebSocket bridge, ring buffer, reconnect, and session management API
- [ ] **Phase 3: Terminal UI** - xterm.js frontend, tab management, and responsive layout
- [ ] **Phase 4: Shell & Launcher** - Bash shell tab, saved directories, and session naming

## Phase Details

### Phase 1: Backend Foundation
**Goal**: A secured Node.js server that can spawn PTY processes and track them in a session registry — auth-protected and testable via curl
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, SESS-01, SESS-02, SESS-04
**Success Criteria** (what must be TRUE):
  1. User can POST to /auth/login with the correct password and receive a JWT token
  2. A JWT token stored in the browser persists across page refresh and is accepted by all protected endpoints
  3. Any request without a valid JWT to any HTTP endpoint or WebSocket upgrade is rejected with 401
  4. A new PTY session can be created in a specified VPS directory via the API, and the Claude process appears in `ps aux` on the VPS
  5. Multiple PTY sessions exist simultaneously and remain running after the API client disconnects
**Plans**: 4 plans

Plans:
- [ ] 01-01-PLAN.md — Project scaffolding: package.json, tsconfig.json, Jest config, node-pty mock, and all test stub files
- [ ] 01-02-PLAN.md — Auth implementation: JWT middleware, login route, and Express app factory
- [ ] 01-03-PLAN.md — Session registry: SessionRecord types, in-memory Map registry, PTY spawn and kill lifecycle
- [ ] 01-04-PLAN.md — Server wiring: session router, WebSocket upgrade auth, and server entry point

### Phase 2: Session Engine
**Goal**: Sessions are fully persistent across browser disconnects, reconnectable with scrollback replay, and manageable (list, kill) via a REST API — all protected by JWT
**Depends on**: Phase 1
**Requirements**: SESS-03, SESS-05, TERM-01, TERM-02, TERM-03
**Success Criteria** (what must be TRUE):
  1. User can connect a WebSocket to an existing session and see live PTY output rendered with full ANSI color and formatting in the terminal
  2. After closing the browser and reopening, user reconnects to the same session and sees recent output replayed before the live stream resumes
  3. All Claude interactive prompts (approve/deny, diffs, menus, slash commands) work correctly over the WebSocket connection
  4. Resizing the browser window propagates SIGWINCH to the PTY and Claude reflows its output layout correctly
  5. User can gracefully kill a session via the API (SIGTERM then SIGKILL) and the session status updates to exited
**Plans**: TBD

### Phase 3: Terminal UI
**Goal**: A browser UI where users can open, switch, and close session tabs, with each terminal rendering full ANSI output and the layout working on both mobile and desktop
**Depends on**: Phase 2
**Requirements**: TERM-04, TERM-05, TERM-06
**Success Criteria** (what must be TRUE):
  1. User can create a new session tab, switch between multiple tabs, and close a tab — each tab shows its own independent terminal
  2. Each tab displays a status indicator (running / idle / exited) that reflects actual session state
  3. The interface is usable on a mobile phone — the terminal renders correctly, the tab bar is navigable, and control shortcuts (Ctrl+C, Esc, Tab) are accessible via touch buttons
**Plans**: TBD

### Phase 4: Shell & Launcher
**Goal**: Users can open a bash shell tab using the same PTY infrastructure, save project directories for one-click session launch, and name sessions for clarity
**Depends on**: Phase 3
**Requirements**: SHLL-01, SHLL-02, SHLL-03
**Success Criteria** (what must be TRUE):
  1. User can open a bash shell tab that behaves identically to a Claude session tab but runs bash — suitable for running tests, checking logs, and managing files
  2. User can save a list of project directories and launch a new session in any of them with one click
  3. User can give any session a custom name/label that appears in the tab bar and persists for the session lifetime
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend Foundation | 1/4 | In Progress|  |
| 2. Session Engine | 0/TBD | Not started | - |
| 3. Terminal UI | 0/TBD | Not started | - |
| 4. Shell & Launcher | 0/TBD | Not started | - |
