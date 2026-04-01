# Phase 4: Shell & Launcher - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Three additive features on top of the Phase 3 UI: (1) a bash shell tab using the same PTY infrastructure as Claude sessions, (2) saved project directories for one-click session launch, (3) custom session naming. No new backend architecture — extends existing registry, API, and frontend.

Covers: SHLL-01, SHLL-02, SHLL-03

</domain>

<decisions>
## Implementation Decisions

### Bash Shell Tab (SHLL-01)
- Backend: POST /sessions accepts optional `{"cwd":"/path","command":"bash"}` — if `command` field is present and equals "bash", spawn `bash` instead of `claude` (or CLAUDE_CMD)
- `command` defaults to `claude` if omitted — fully backwards compatible with Phase 1/2/3
- PTY spawn, WebSocket bridge, ring buffer, tab management all identical to Claude sessions — no special-casing beyond the spawn command
- Tab label defaults to "Shell" for bash sessions; "Session N" for Claude sessions
- Status indicators work identically — same running/idle/exited logic

### Saved Directories (SHLL-02)
- Stored in `localStorage` key `"vps_saved_dirs"` as a JSON array of strings: `["/home/user/project1", "/home/user/project2"]`
- No server-side persistence — localStorage is sufficient for a personal tool
- UI: "Saved Dirs" panel or sidebar section listing each saved directory with a "Launch" button (spawns Claude session) and "Remove" button
- "Save current dir" button in the New Session modal — after typing a cwd, user can save it before/after launching
- No limit on number of saved directories

### Session Naming (SHLL-03)
- Sessions have an optional `name` field — stored in frontend JS state only (not persisted server-side in v1)
- Rename flow: double-click tab label to edit inline (contenteditable or input field), Enter to confirm, Esc to cancel
- Name appears in tab bar; truncated at 20 chars with ellipsis if too long
- Default name: "Session N" (auto-incrementing counter) for Claude; "Shell" for bash

### New Session Modal Updates
- Add "Type" toggle: Claude / Shell (defaults to Claude)
- Add "Save directory" checkbox
- Layout: working directory input, type toggle, save checkbox, Start button

### Claude's Discretion
- Saved dirs panel placement (sidebar vs. dropdown vs. inline below tab bar)
- Exact inline edit UX for renaming (contenteditable vs. temporary input overlay)
- Auto-increment counter reset behavior (reset to 1 on page refresh — acceptable)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — SHLL-01, SHLL-02, SHLL-03 acceptance criteria
- `.planning/PROJECT.md` — Stack constraints

### Prior Phases
- `.planning/phases/03-terminal-ui/03-CONTEXT.md` — Frontend architecture (vanilla JS, tab state shape, New Session modal)
- `.planning/phases/01-backend-foundation/01-CONTEXT.md` — Session registry, spawn configuration (CLAUDE_CMD env var)
- `.planning/phases/01-backend-foundation/01-03-PLAN.md` — createSession() — Phase 4 extends to accept optional command parameter

### No external specs
No ADRs or feature docs beyond PROJECT.md and REQUIREMENTS.md.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/sessions/session.registry.ts` — createSession(cwd) — Phase 4 extends to createSession(cwd, command?)
- `src/sessions/session.router.ts` — POST /sessions handler — Phase 4 reads optional `command` field from body
- `public/app.js` (Phase 3) — tab state shape, New Session modal — Phase 4 extends both

### Established Patterns
- PTY spawn: `pty.spawn(claudeCmd, [], {...})` — Phase 4 replaces claudeCmd with `command ?? claudeCmd`
- All tab management, WS connection, ring buffer works identically regardless of command

### Integration Points
- Backend: session.router.ts POST handler passes command to registry
- Frontend: New Session modal adds type selector; saved dirs panel reads/writes localStorage

</code_context>

<specifics>
## Specific Ideas

- Bash tab should feel identical to Claude tab — same terminal, same controls, same status indicator
- Saved dirs make repeat launches fast — key UX win for regular workflows

</specifics>

<deferred>
## Deferred Ideas

- Server-side saved directory persistence (survive browser clear) — v2
- Session naming persisted server-side — v2
- Per-directory auto-launch on startup — not requested

</deferred>

---

*Phase: 04-shell-launcher*
*Context gathered: 2026-04-01*
