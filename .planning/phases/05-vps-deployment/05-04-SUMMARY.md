---
phase: 05-vps-deployment
plan: "04"
subsystem: infra
tags: [npm, node-pty, bcrypt, deploy, native-modules, abi]

# Dependency graph
requires:
  - phase: 05-03
    provides: deploy.sh with 4-step deploy and docs/vps-setup.md initial setup guide
provides:
  - deploy.sh with 5-step deploy including npm rebuild for native module ABI safety
  - docs/vps-setup.md section 4 documenting npm rebuild with explanation
affects: [future Node.js upgrades on VPS, native module maintenance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "npm rebuild after npm ci on every deploy — ensures native module binaries match running Node.js ABI"

key-files:
  created: []
  modified:
    - deploy.sh
    - docs/vps-setup.md

key-decisions:
  - "npm rebuild runs on every deploy (not just after Node.js upgrades) — cheap operation, prevents silent ABI mismatch"
  - "set -euo pipefail ensures npm rebuild failure exits before pm2 reload — running process stays up on failed deploy"

patterns-established:
  - "Deploy order: git pull → npm ci → npm rebuild → npm run build → pm2 reload"

requirements-completed: [DEPLOY-02, DEPLOY-05]

# Metrics
duration: 3min
completed: "2026-04-06"
---

# Phase 5 Plan 04: Gap Closure — npm rebuild Summary

**deploy.sh updated to 5-step sequence (git pull → npm ci → npm rebuild → npm run build → pm2 reload) preventing ABI mismatch crashes after Node.js upgrades; docs/vps-setup.md section 4 updated to match with node-pty/bcrypt rebuild explanation**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-06T14:56:16Z
- **Completed:** 2026-04-06T14:59:06Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- deploy.sh step count expanded from 4 to 5 with npm rebuild as step [3/5]
- Native C++ modules (node-pty, bcrypt) now recompile on every deploy — no ABI mismatch crashes after `apt upgrade nodejs`
- docs/vps-setup.md section 4 now mirrors the deploy script sequence with a clear explanation of why npm rebuild is required

## Task Commits

Each task was committed atomically:

1. **Task 1: Add npm rebuild step to deploy.sh** - `1452d48` (fix)
2. **Task 2: Document npm rebuild in docs/vps-setup.md** - `414799f` (docs)

**Plan metadata:** (see final commit)

## Files Created/Modified

- `deploy.sh` - Added npm rebuild as step [3/5]; updated step count from 4 to 5 throughout; updated comment header
- `docs/vps-setup.md` - Added npm rebuild to section 4 "Build the app" with explanation of ABI matching requirement

## Decisions Made

- npm rebuild runs on every deploy, not conditionally — the operation is cheap (seconds) and eliminates the possibility of silent ABI mismatch after any Node.js upgrade
- set -euo pipefail already present means npm rebuild failure halts the deploy before pm2 reload; the running process stays up (zero downtime on failed deploy)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 05 gap closure complete
- All 12 verification truths now pass (including truth 12: deploy.sh handles native module rebuild after npm ci)
- VPS deployment documentation is complete and self-consistent
- deploy.sh and docs/vps-setup.md are in sync

---
*Phase: 05-vps-deployment*
*Completed: 2026-04-06*
