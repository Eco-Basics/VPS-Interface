---
phase: 04-shell-launcher
plan: 01
completed: 2026-04-03
commit: fb5d52a
one_liner: "Extended backend to support bash sessions via ALLOWED_COMMANDS allowlist and command field propagation through types → registry → API"
---

# Phase 04-01 Summary: Backend Command Validation

## What Was Built

Extended the session backend to support optional command selection with strict allowlist enforcement.

### Files Modified

- `src/sessions/session.types.ts` — Added `command: string` field to `SessionRecord` and `SessionListItem`; updated `toListItem` to include command in API response
- `src/sessions/session.registry.ts` — `createSession` now accepts `command?: string`; stores resolved command on the session record
- `src/sessions/session.router.ts` — Added `ALLOWED_COMMANDS = ['bash', CLAUDE_CMD]` allowlist; `POST /sessions` returns 400 for unlisted commands
- `tests/session.router.test.ts` — Three new tests: bash returns 201, invalid command returns 400 (createSession not called), omitted command is backwards-compatible

### Key Decisions

- Allowlist approach (not denylist) — safer default; new commands require explicit opt-in
- `command` stored on `SessionRecord` so frontend can distinguish session type for labelling

## Verification

All 11 session.router tests pass. ALLOWED_COMMANDS validation confirmed via UAT.

## Requirements Satisfied

- SHLL-01 (partial — backend half): backend now spawns bash via same PTY infrastructure
