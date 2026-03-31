# Claude VPS Interface

## What This Is

A browser-based interface for managing Claude Code sessions running on a remote VPS. Designed as a functional terminal mirror — not a visual clone of a terminal, but full parity in control and information. Access your Claude Code sessions from any device (phone, tablet, desktop) without a local machine or SSH client.

## Core Value

Full Claude Code interactivity from any device, anywhere — spawn sessions in project directories, answer every prompt, run tests, and manage work without ever opening a terminal locally.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can log in with a password from any browser
- [ ] User can spawn a Claude Code session in a specified VPS directory
- [ ] User can interact with Claude fully — text input, approve/deny prompts, diffs, menus, slash commands
- [ ] User can manage multiple Claude Code sessions simultaneously (tabs + optional split pane)
- [ ] Sessions persist server-side — closing the browser does not kill the Claude process
- [ ] User can reconnect to a running session after closing and reopening the browser
- [ ] User can open a shell tab for running commands outside Claude (tests, logs, builds)
- [ ] User can save and quick-launch sessions from a list of project directories
- [ ] Interface is responsive and usable on mobile (phone, tablet) and desktop
- [ ] Terminal output renders with full ANSI color and formatting via xterm.js

### Out of Scope

- File uploads/downloads (SCP/SFTP) — not needed, files live on VPS; use git or curl for transfers
- Multi-user access — single personal-use interface, one set of credentials
- Built-in code editor or file browser — Claude handles file work, shell tab for inspection
- Full SSH administration panel — light shell only, not a VPS management tool
- Native desktop app — web browser is sufficient, simpler to build and maintain

## Context

- VPS accessed currently via SSH (password or key-based)
- Claude Code is already installed and used actively on the VPS
- User runs multiple Claude sessions in parallel (like multiple terminal tabs)
- All interactive Claude prompts (permissions, diffs, yes/no, multi-choice) must work
- Sessions started in specific project directories (e.g., `/home/user/projects/myapp`)
- Backend server will run on the VPS itself, frontend connects over WebSocket
- Auth: password login → JWT session token (standard, auditable, no static tokens)

## Constraints

- **Stack**: Node.js backend (node-pty for PTY management, WebSocket bridge); React or vanilla JS frontend with xterm.js for terminal rendering
- **Deployment**: Backend runs as a persistent process on VPS (pm2 or systemd); accessible via HTTPS with a reverse proxy (nginx/caddy)
- **Security**: Password login → JWT; HTTPS required; no unauthenticated access to any endpoint
- **Compatibility**: Every Claude Code interactive prompt type must work — PTY must be a real pseudo-terminal, not a pipe

## Current Milestone: v1.0 Core

**Goal:** Ship a fully functional browser-based Claude Code terminal — auth, PTY sessions, WebSocket bridge, xterm.js UI, session persistence, multi-tab management, shell tab, and quick-launch directories.

**Target features:**
- Password + JWT authentication (all endpoints protected)
- PTY session registry with persistence across browser disconnects
- xterm.js terminal with full ANSI rendering and interactive prompt support
- Tab-based multi-session management with status indicators
- Session reconnect with scrollback replay
- Bash shell tab for running commands outside Claude
- Saved project directories with one-click session launch
- Mobile-responsive layout

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Browser-based (not desktop app) | Device-agnostic, no install, simpler deployment | — Pending |
| PTY-based sessions (not pipe-based) | Required for full Claude interactive prompt compatibility | — Pending |
| Backend runs on VPS (not proxy from elsewhere) | Sessions are local to where Claude runs; no latency hop | — Pending |
| JWT auth (not static password) | Standard, revocable, auditable sessions | — Pending |
| xterm.js for rendering | Same engine as VS Code terminal; handles all ANSI; mobile-compatible | — Pending |
| Vanilla JS frontend (not React/Vue) | No build pipeline; simpler deployment; UI scope is small | — Pending |
| ws library (not socket.io) | Raw WebSocket sufficient; socket.io abstractions unneeded; smaller bundle | — Pending |
| Caddy reverse proxy (not nginx) | Auto-HTTPS via Let's Encrypt with zero config | — Pending |

---
*Last updated: 2026-03-31 after milestone v1.0 Core started*
