---
phase: 05-vps-deployment
plan: 02
subsystem: infra
tags: [pm2, process-management, deployment, ecosystem-config]

# Dependency graph
requires:
  - phase: 05-01
    provides: setup.sh and docs/vps-setup.md establish VPS provisioning baseline
provides:
  - ecosystem.config.js — pm2 process config with app name, entry point, production env, no embedded secrets
  - docs/pm2-setup.md — first-time pm2 registration guide covering startup + save for reboot survival
affects: [05-03-deploy-script]

# Tech tracking
tech-stack:
  added: [pm2]
  patterns: [pm2 ecosystem config as version-controlled file, secrets loaded by dotenv not pm2 env block]

key-files:
  created:
    - ecosystem.config.js
    - docs/pm2-setup.md
  modified: []

key-decisions:
  - "pm2 app name is exactly 'claude-vps-interface' — must match deploy.sh pm2 reload target in plan 03"
  - "script: node + args: dist/src/server.js instead of npm start — avoids npm subprocess layer under pm2"
  - "Secrets (PASSWORD, JWT_SECRET) NOT in pm2 env block — dotenv loads them from .env at process startup"
  - "instances: 1 — PTY sessions are stateful in-memory, cannot be shared across pm2 cluster workers"

patterns-established:
  - "pm2 reload (not restart) for normal deploys — zero-downtime; pm2 restart only after ecosystem.config.js edits"
  - "pm2 startup + pm2 save required once after first deploy for reboot survival"

requirements-completed: [DEPLOY-02, DEPLOY-04]

# Metrics
duration: 3min
completed: 2026-04-06
---

# Phase 05 Plan 02: pm2 Process Management Summary

**pm2 ecosystem.config.js with app name matching deploy.sh, dotenv-based secrets, and first-time setup guide covering startup + save for reboot survival**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-06T09:47:28Z
- **Completed:** 2026-04-06T09:50:20Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `ecosystem.config.js` created at project root with correct pm2 app config — name, entry point, single instance, autorestart, no embedded secrets
- `docs/pm2-setup.md` created covering first-time registration (pm2 start, pm2 startup, pm2 save), log access, and reload vs restart decision
- All plan acceptance criteria verified before each commit

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ecosystem.config.js** - `261af24` (chore)
2. **Task 2: Create docs/pm2-setup.md** - `995fb47` (docs)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `ecosystem.config.js` — pm2 process config: name=claude-vps-interface, script=node, args=dist/src/server.js, instances=1, autorestart=true, watch=false, max_memory_restart=500M, NODE_ENV=production
- `docs/pm2-setup.md` — pm2 registration and management guide: first-time startup+save, log access, reload vs restart table, ecosystem edit workflow

## Decisions Made

- `script: 'node'` + `args: 'dist/src/server.js'` chosen over `script: 'npm'` + `args: 'start'` — avoids npm subprocess layer; pm2 signals go directly to node process
- pm2 env block contains only `NODE_ENV: 'production'` — all secrets loaded by `dotenv/config` at server.ts startup, never embedded in version-controlled config
- `instances: 1` — PTY sessions are stateful in-memory objects; clustering would break session persistence across reloads

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Shell escaping of `!` in `!==` operator caused `node -e` inline verification to fail. Resolved by writing a temporary verification script file (`verify-ecosystem.js`) which was removed after verification. No code changes needed.

## User Setup Required

None - no external service configuration required. All commands are documented in docs/pm2-setup.md for the user to run on the VPS after first deploy.

## Next Phase Readiness

- `ecosystem.config.js` is committed and will be available on VPS after `git pull`
- Plan 03 (deploy.sh) can reference `pm2 reload claude-vps-interface` — the app name is locked in ecosystem.config.js
- VPS setup guide (docs/vps-setup.md from plan 01) + pm2 guide (docs/pm2-setup.md from plan 02) together cover full first-time server provisioning

## Self-Check: PASSED

- FOUND: ecosystem.config.js
- FOUND: docs/pm2-setup.md
- FOUND: .planning/phases/05-vps-deployment/05-02-SUMMARY.md
- FOUND commit: 261af24 (ecosystem.config.js)
- FOUND commit: 995fb47 (pm2-setup.md)

---
*Phase: 05-vps-deployment*
*Completed: 2026-04-06*
