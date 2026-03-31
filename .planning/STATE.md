# State: Claude VPS Interface

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-31)

**Core value:** Full Claude Code interactivity from any device, anywhere
**Current focus:** Milestone v1.0 Core — defining roadmap

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-31 — Milestone v1.0 Core started

## Accumulated Context

- Research complete: FEATURES.md, STACK.md, ARCHITECTURE.md, PITFALLS.md all in .planning/research/
- Stack decided: Node.js + node-pty + ws + Express + JWT/bcrypt + xterm.js + Caddy + pm2
- Key architectural insight: PTY lifecycle owned by session registry, NOT the WebSocket handler — session persists across browser disconnects
- 17 v1 requirements defined across 4 categories: AUTH, SESS, TERM, SHLL
