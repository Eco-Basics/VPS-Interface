# Retrospective

## Milestone: v1.0 — MVP

**Shipped:** 2026-04-03
**Phases:** 4 | **Plans:** 14

### What Was Built

- Secured Node.js/Express backend with JWT auth protecting all HTTP and WebSocket endpoints
- PTY session registry using node-pty — real pseudo-terminal, not a pipe, so all Claude prompts work
- WebSocket bridge with ring buffer (1000 entries) for scrollback replay on reconnect
- xterm.js browser frontend — full ANSI rendering, tab management, responsive mobile layout
- Bash shell tab via ALLOWED_COMMANDS allowlist — same PTY infrastructure, separate session type
- Saved project directories with localStorage persistence
- Auto-numbered tabs (Shell 1/2, Session 1/2), status dots (green/red/grey)

### What Worked

- **TDD on backend** — writing tests before implementation caught the ALLOWED_COMMANDS gap immediately
- **GSD verification loop** — having a VERIFICATION.md produced before UAT meant the human browser tests were pre-planned with exact steps
- **Codex for multi-file writes** — delegating large implementation blocks to Codex protected Claude's context budget significantly
- **UAT as the final gate** — surfaced real issues (button label, dot colours, tab numbering) that static code review would have missed
- **Fixing issues during UAT** — small fixes (status dot colours, Shell N numbering) were resolved inline without a separate phase

### What Was Inefficient

- Phase 04 SUMMARY.md files were not generated during execution (Codex ran directly without GSD summary step) — had to generate them manually before milestone close
- `npm start` path bug (`dist/server.js` vs `dist/src/server.js`) only surfaced during UAT, not during build
- Two Codex commits for Phase 04 (04-01 and 04-02) were duplicated because Codex ran without permission to commit — redundant commits in history

### Patterns Established

- **Status dot semantics**: green=active, red=attention-needed (idle/input required), grey=terminal (exited) — more intuitive than colour-by-state-name
- **Auto-numbering over inline rename**: "Shell 1", "Shell 2" gives immediate context without interaction; inline rename adds UI complexity with low ROI for personal tools
- **Allowlist over denylist for shell commands**: explicit opt-in is safer by default, easier to audit

### Key Lessons

- Generate SUMMARY.md files as part of every execution phase, even when delegating to Codex
- Test `npm start` (compiled output) during verification, not just `npm run dev` (ts-node)
- UAT is the right place to validate UX decisions (labels, colours, interactions) — don't over-design before user feedback

### Cost Observations

- Model mix: primarily Claude Sonnet 4.6 for reasoning/auditing; Codex for multi-file writes
- Notable: Codex delegation for Phase 04 saved significant context but introduced the missing-SUMMARY gap

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases | 4 |
| Plans | 14 |
| UAT issues found | 3 (1 cosmetic fixed inline, 2 converted to design decisions) |
| Build errors at UAT | 1 (start script path) |
| Rework cycles | 1 (bash tab label: fixed command field propagation through types) |
