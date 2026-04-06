---
phase: 05-vps-deployment
plan: 01
subsystem: infra
tags: [ubuntu, nodejs, pm2, caddy, ufw, bash, setup]

# Dependency graph
requires:
  - phase: 01-backend-foundation
    provides: .env.example documenting all required env vars and bcrypt native build note
provides:
  - setup.sh — one-time Ubuntu 22.04 VPS provisioning script (Node.js 20, pm2, Caddy, ufw)
  - docs/vps-setup.md — human guide covering all DEPLOY-01 manual steps with context
affects:
  - 05-02 (pm2-setup — references setup.sh and this guide)
  - 05-03 (caddy-setup — references setup.sh and firewall decisions)

# Tech tracking
tech-stack:
  added: [caddy, pm2, ufw, nodejs-20-nodesource]
  patterns: [server-side setup script committed to repo, docs/ directory for operational guides]

key-files:
  created:
    - setup.sh
    - docs/vps-setup.md
  modified: []

key-decisions:
  - "setup.sh does not open port 3000 in ufw — Caddy proxies internally; port 3000 never public-facing"
  - "Claude Code installation documented via Anthropic URL but not scripted — external install procedure"
  - "Node.js 20 installed via NodeSource setup_20.x — pins major version, consistent with dev"
  - "build-essential and python3 included for bcrypt native C++ module compilation"

patterns-established:
  - "Operational scripts (setup.sh, deploy.sh) live in project root, committed to git"
  - "docs/ directory holds human-readable operational guides as companions to scripts"
  - "setup.sh uses set -euo pipefail for fail-fast behavior on any error"

requirements-completed: [DEPLOY-01]

# Metrics
duration: 5min
completed: 2026-04-06
---

# Phase 5 Plan 01: VPS Provisioning Script and Setup Guide Summary

**Ubuntu 22.04 VPS bootstrap script (setup.sh) with Node.js 20 via NodeSource, pm2, Caddy via apt, and ufw firewall rules — plus human setup guide (docs/vps-setup.md) covering all DEPLOY-01 steps**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-06T09:40:00Z
- **Completed:** 2026-04-06T09:43:46Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created setup.sh: idempotent VPS provisioning script installing all required system tools in correct dependency order
- Configured ufw to expose only ports 22/80/443 — port 3000 is internal-only, never exposed
- Created docs/vps-setup.md: step-by-step companion guide explaining why each step is needed, with all env var documentation and JWT_SECRET generation command

## Task Commits

Each task was committed atomically:

1. **Task 1: Create setup.sh** - `b811bc4` (feat)
2. **Task 2: Create docs/vps-setup.md** - `d25fe3c` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `setup.sh` — One-time VPS provisioning: installs git, build-essential, python3, Node.js 20, pm2, Caddy, configures ufw
- `docs/vps-setup.md` — Human guide: prerequisites, run setup.sh, install Claude Code, create .env, build app, firewall summary

## Decisions Made
- Port 3000 intentionally excluded from ufw rules — Caddy reverse-proxies internally; this follows the security decision from 05-CONTEXT.md
- ALLOWED_COMMANDS included in docs/vps-setup.md env var table even though not yet in .env.example — plan spec required it; aligns with ALLOWED_COMMANDS logic in codebase
- docs/ directory created as home for operational guides (pm2-setup.md and caddy-setup.md referenced for Plans 02-03)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. .env.example has 4 vars (PASSWORD, JWT_SECRET, PORT, CLAUDE_CMD); plan template listed a 5th (ALLOWED_COMMANDS). Included all five in docs per the plan spec — the codebase references ALLOWED_COMMANDS so it is a valid env var.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- setup.sh and docs/vps-setup.md are committed and ready for the VPS operator
- Plan 02 (pm2-setup) should create ecosystem.config.js and docs/pm2-setup.md
- Plan 03 (caddy-setup) should create Caddyfile and docs/caddy-setup.md
- Both follow-on plans are referenced from docs/vps-setup.md sections 5 and 6

---
*Phase: 05-vps-deployment*
*Completed: 2026-04-06*

## Self-Check: PASSED

- setup.sh: FOUND
- docs/vps-setup.md: FOUND
- .planning/phases/05-vps-deployment/05-01-SUMMARY.md: FOUND
- Commit b811bc4: FOUND
- Commit d25fe3c: FOUND
