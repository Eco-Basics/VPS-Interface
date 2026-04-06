---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: VPS Deployment
status: unknown
stopped_at: Completed 05-04-PLAN.md
last_updated: "2026-04-06T15:06:35.079Z"
progress:
  total_phases: 1
  completed_phases: 1
  total_plans: 4
  completed_plans: 4
---

# State: Claude VPS Interface

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-31)

**Core value:** Full Claude Code interactivity from any device, anywhere
**Current focus:** Phase 05 — vps-deployment

## Current Position

Phase: 05 (vps-deployment) — EXECUTING
Plan: 1 of 4

## Performance Metrics

**Velocity:**

- Total plans completed: 3
- Average duration: ~12m
- Total execution time: ~37m

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 3 | ~37m | ~12m |

**Recent Trend:**

- Last 5 plans: 01-01, 01-02, 01-03
- Trend: on track

*Updated after each plan completion*
| Phase 01-backend-foundation P01 | 22m | 3 tasks | 7 files |
| Phase 01-backend-foundation P04 | 10m | 2 tasks | 7 files |
| Phase 02-session-engine P01 | 4min | 3 tasks | 4 files |
| Phase 02-session-engine P02 | 12 | 3 tasks | 4 files |
| Phase 02-session-engine P03 | 7m | 2 tasks | 2 files |
| Phase 02-session-engine P04 | 6m | 4 tasks | 3 files |
| Phase 03-terminal-ui P01 | 5m | 4 tasks | 4 files |
| Phase 03-terminal-ui P02 | 2m | 1 tasks | 0 files |
| Phase 03-terminal-ui P03 | 5min | 2 tasks | 2 files |
| Phase 03-terminal-ui P04 | 4m | 4 tasks | 1 files |
| Phase 05-vps-deployment P01 | 5min | 2 tasks | 2 files |
| Phase 05-vps-deployment P02 | 3min | 2 tasks | 2 files |
| Phase 05-vps-deployment P03 | 3min | 2 tasks | 2 files |
| Phase 05-vps-deployment P04 | 3min | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Stack: Node.js + node-pty + ws + Express + JWT/bcrypt + xterm.js + Caddy + pm2 (all confirmed)
- Frontend: Vanilla JS + ES modules, no build step — chosen for simplicity
- PTY lifecycle owned by session registry, NOT the WebSocket handler — sessions survive browser close
- JWT passed as query param on WS URL (acceptable for personal tool; simpler than first-message handshake)
- createApp() async factory pattern — avoids async mount race condition in tests; tests call createApp() in beforeAll
- requireAuth applied after /auth mount so login route is exempt without special exclusion logic
- passwordHash injected into createAuthRouter — avoids module-level side effects and per-request re-hashing
- SessionRecord stored in module-level Map — PTY owned by registry, not request handler (enables SESS-02 session survival across browser close)
- Session records never deleted from Map — status transitions to 'exited' in-place for Phase 2 reconnect inspection
- CLAUDE_CONFIG_DIR set per-session (/tmp/claude-sessions/{id}) — prevents concurrent session transcript corruption
- transformIgnorePatterns excludes uuid from node_modules ignore — uuid v13 is ESM-only, ts-jest must transform it
- [Phase 01-backend-foundation]: uuid downgraded to v9.0.1 — v13 ESM-only breaks ts-jest CJS preset; v4 API identical
- [Phase 01-backend-foundation]: node-pty mock wired globally via moduleNameMapper in jest.config.ts — no jest.mock() in test files
- [Phase 01-backend-foundation]: dotenv loaded via import 'dotenv/config' at top of server.ts — ensures PASSWORD and JWT_SECRET are defined before createApp() reads them
- [Phase 01-backend-foundation]: tsconfig.json rootDir removed — rootDir: src incompatible with including tests/ directory; outDir: dist retained
- [Phase 02-session-engine]: node-pty mock returns IDisposable { dispose: jest.fn() } from onData/onExit — matches real node-pty API contract for session registry cleanup
- [Phase 02-session-engine]: getMockPtyInstance() throws if no instance created — fail-fast behavior catches tests forgetting to trigger PTY spawn
- [Phase 02-session-engine]: lastMockPtyInstance module-level var updated on each spawn() — gives tests access to most recent PTY without import coupling
- [Phase 02-session-engine]: dataDisposable called in exit handler to prevent onData firing after PTY exits
- [Phase 02-session-engine]: registry-owned clients Set: WS handler adds/removes but never creates or destroys the Set
- [Phase 02-session-engine]: record.status = exited moved into Phase 2 exit handler for single-handler exit mutation
- [Phase 02-session-engine]: superwstest .wait(50) needed between sendJson and exec for server message processing timing
- [Phase 02-session-engine]: buffer replay sent as single joined string before clients.add(ws) for race safety
- [Phase 02-session-engine]: attachWebSocketAuth takes (server, wss) — wss injected so server.ts controls shared instance lifetime
- [Phase 02-session-engine]: sessionId validated in upgrade handler before handleUpgrade fires — rejects at TCP level before any WS frame sent
- [Phase 03-terminal-ui]: CDN tags pinned to xterm@5.3.0 and xterm-addon-fit@0.8.0 (exact versions)
- [Phase 03-terminal-ui]: express.static mounted before /auth and requireAuth so frontend is publicly accessible
- [Phase 03-terminal-ui]: Auth flow was complete in 03-01 scaffold; 03-02 verified correctness with no code changes
- [Phase 03-terminal-ui]: HTML IDs corrected to match plan code (tab-list, terminal-panels, new-session-cancel); session-type radios added to modal
- [Phase 03-terminal-ui]: apiFetch extended to set Content-Type for string bodies; init() delegates session fetching to async showTerminal()
- [Phase 03-terminal-ui]: resizeTimer scoped at module level (not per-session) so only one global debounce runs
- [Phase 03-terminal-ui]: Mobile toolbar uses event delegation rather than per-button listeners
- [Phase 05-vps-deployment]: setup.sh excludes port 3000 from ufw — Caddy proxies internally; never public-facing
- [Phase 05-vps-deployment]: Node.js 20 installed via NodeSource setup_20.x — pins major version for reproducibility
- [Phase 05-vps-deployment]: Claude Code installation linked to Anthropic docs URL but not scripted — external install procedure
- [Phase 05-vps-deployment]: pm2 app name is exactly 'claude-vps-interface' — must match deploy.sh pm2 reload target in plan 03
- [Phase 05-vps-deployment]: pm2 script: node + args: dist/src/server.js — avoids npm subprocess layer; pm2 signals go directly to node process
- [Phase 05-vps-deployment]: Secrets NOT in pm2 env block — dotenv loads them from .env at server.ts startup
- [Phase 05-vps-deployment]: pm2 instances: 1 — PTY sessions are stateful in-memory, cannot share across cluster workers
- [Phase 05-vps-deployment]: deploy.sh uses set -euo pipefail — build failure exits before pm2 reload, running process stays up
- [Phase 05-vps-deployment]: Caddy tls internal self-signed cert — no domain required; browser exception needed once per browser
- [Phase 05-vps-deployment]: npm rebuild runs on every deploy to prevent silent ABI mismatch after Node.js upgrades on VPS
- [Phase 05-vps-deployment]: set -euo pipefail in deploy.sh ensures npm rebuild failure exits before pm2 reload — running process stays up on failed deploy

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-04-06T15:01:08.824Z
Stopped at: Completed 05-04-PLAN.md
Resume file: None
