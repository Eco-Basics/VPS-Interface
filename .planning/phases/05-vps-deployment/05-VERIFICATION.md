---
phase: 05-vps-deployment
verified: 2026-04-06T15:10:00Z
status: passed
score: 12/12 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 11/12
  gaps_closed:
    - "deploy.sh handles native module rebuild after npm ci"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Provision a fresh Ubuntu 22.04 VPS, run setup.sh, configure .env, build the app (npm ci → npm rebuild → npm run build), start via pm2, apply Caddyfile — then browse to https://<vps-ip>/"
    expected: "Browser reaches the app after accepting the self-signed cert warning. Login screen appears. Session can be created and Claude Code runs."
    why_human: "Requires an actual VPS, live Caddy process, pm2 process, and browser TLS-warning flow."
  - test: "After pm2 startup + pm2 save per docs/pm2-setup.md, reboot the VPS and wait 30 seconds."
    expected: "pm2 status shows claude-vps-interface as online without manual intervention."
    why_human: "Requires a VPS reboot cycle. PITFALLS.md notes a known failure mode with nvm; current setup uses NodeSource system install which avoids it, but reboot survival must be confirmed live."
  - test: "With Caddyfile as documented, open a terminal session in the web UI."
    expected: "xterm.js connects via WebSocket through Caddy's reverse proxy. Terminal output appears and input is relayed. No 502 or WS upgrade failures."
    why_human: "WebSocket upgrade behavior through Caddy's reverse_proxy depends on runtime behavior that cannot be verified statically."
---

# Phase 5: VPS Deployment Verification Report

**Phase Goal:** Deploy the app to a real VPS — accessible via HTTPS, always-on via pm2, and updatable via a single deploy script.
**Verified:** 2026-04-06T15:10:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure by plan 05-04

## Re-verification Summary

Previous status: `gaps_found` (11/12, scored 2026-04-06T10:30:00Z)

Single gap from previous pass:

- **Gap:** deploy.sh missing `npm rebuild` between `npm ci` and `npm run build`
- **Closure:** Plan 05-04 (commits `1452d48` and `414799f`) added `npm rebuild` as step [3/5] in deploy.sh and updated docs/vps-setup.md section 4 to match.
- **Regression check:** All 11 previously-verified truths confirmed unchanged.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | setup.sh exists in project root and is executable | VERIFIED | File present, `test -x setup.sh` passes |
| 2 | setup.sh installs Node.js 20, git, pm2, Caddy, build-essential, python3 | VERIFIED | Lines 11, 15, 24, 34 — all packages present |
| 3 | Firewall opens only 22/80/443 — port 3000 never exposed | VERIFIED | ufw rules at lines 38-40; grep "3000" setup.sh returns nothing |
| 4 | docs/vps-setup.md documents every manual step with context | VERIFIED | All five env vars, openssl rand command, Claude Code URL, npm ci → npm rebuild → npm run build, firewall table with port 3000 as internal-only |
| 5 | ecosystem.config.js exists with correct pm2 app config | VERIFIED | name=claude-vps-interface, args=dist/src/server.js, instances=1, autorestart=true, watch=false, NODE_ENV=production |
| 6 | ecosystem.config.js does not contain secrets | VERIFIED | PASSWORD and JWT_SECRET absent from env block |
| 7 | docs/pm2-setup.md covers first-time registration and reboot survival | VERIFIED | pm2 startup, pm2 save, pm2 start ecosystem.config.js, reload vs restart table all present |
| 8 | deploy.sh exists, is executable, runs git pull → npm ci → npm rebuild → npm run build → pm2 reload | VERIFIED | All five steps present in order; bash -n passes; test -x passes; confirmed by direct read |
| 9 | deploy.sh uses pm2 reload not pm2 restart | VERIFIED | Line 37: `pm2 reload "$APP_NAME"` |
| 10 | deploy.sh does not touch .env | VERIFIED | grep ".env" deploy.sh returns nothing |
| 11 | docs/caddy-setup.md provides Caddyfile with tls internal and reverse_proxy localhost:3000 | VERIFIED | Lines 14-17 Caddyfile block, :80 redirect block, browser exception instructions, 502 troubleshooting |
| 12 | deploy.sh handles native module rebuild after npm ci | VERIFIED | Line 31: `npm rebuild` between `npm ci` (line 28) and `npm run build` (line 34); commit 1452d48 |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `setup.sh` | Ubuntu 22.04 VPS provisioning script | VERIFIED | Exists, executable, contains nodesource setup_20.x, Caddy apt repo, ufw rules. Shebang + set -euo pipefail on lines 1-2 |
| `docs/vps-setup.md` | Step-by-step VPS setup guide | VERIFIED | All five env vars documented, openssl rand command, Anthropic Claude Code URL, npm ci → npm rebuild → npm run build with ABI explanation, firewall table with port 3000 as internal-only |
| `ecosystem.config.js` | pm2 process config | VERIFIED | Valid CommonJS, name='claude-vps-interface', args='dist/src/server.js', autorestart=true, no secrets in env block |
| `docs/pm2-setup.md` | pm2 first-time registration guide | VERIFIED | pm2 startup, pm2 save, pm2 start ecosystem.config.js, pm2 reload reference, log access commands |
| `deploy.sh` | Zero-downtime update script with native module rebuild | VERIFIED | Exists, executable, 5-step sequence: git pull → npm ci → npm rebuild → npm run build → pm2 reload. bash -n passes. set -euo pipefail present. No .env reference. |
| `docs/caddy-setup.md` | Caddy HTTPS reverse proxy guide | VERIFIED | Caddyfile with tls internal + reverse_proxy localhost:3000 + HTTP redirect, systemctl reload caddy, caddy validate, browser exception steps, 502 troubleshooting |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| setup.sh | Node.js 20 | NodeSource setup_20.x | WIRED | curl deb.nodesource.com/setup_20.x at line 15 |
| setup.sh | Caddy | dl.cloudsmith.io/public/caddy apt repo | WIRED | Cloudsmith Caddy apt repo configured at lines 29-34 |
| ecosystem.config.js | dist/src/server.js | args field | WIRED | `args: 'dist/src/server.js'` at line 6 |
| docs/pm2-setup.md | ecosystem.config.js | pm2 start ecosystem.config.js | WIRED | Line 10: `pm2 start ecosystem.config.js` |
| deploy.sh | node-pty / bcrypt native binaries | npm rebuild after npm ci | WIRED | Line 31: `npm rebuild` between npm ci (line 28) and npm run build (line 34) — commit 1452d48 |
| deploy.sh | pm2 reload claude-vps-interface | pm2 reload "$APP_NAME" | WIRED | APP_NAME="claude-vps-interface" at line 19; pm2 reload at line 37 |
| docs/caddy-setup.md | localhost:3000 | reverse_proxy directive | WIRED | `reverse_proxy localhost:3000` in Caddyfile block at line 16 |
| docs/vps-setup.md | npm rebuild explanation | section 4 text | WIRED | Line 56 names node-pty and bcrypt, explains ABI matching; line 58 cross-references deploy.sh — commit 414799f |

### Requirements Coverage

DEPLOY requirements are defined in `.planning/PROJECT.md` (active goals section) and elaborated in `.planning/research/ARCHITECTURE.md`. There is no standalone REQUIREMENTS.md for phase 5 — the source of record for requirement definitions is PROJECT.md.

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DEPLOY-01 | 05-01-PLAN.md | VPS environment ready — Node.js, git, Claude Code installed | SATISFIED | setup.sh installs Node.js 20, git, build-essential, python3. Claude Code install documented with Anthropic URL (not scripted — accepted design decision per CONTEXT.md) |
| DEPLOY-02 | 05-02-PLAN.md, 05-04-PLAN.md | App deployed and running on VPS | SATISFIED | ecosystem.config.js and docs/pm2-setup.md cover process management. deploy.sh covers updates including npm rebuild for native module ABI safety (gap closed in plan 04) |
| DEPLOY-03 | 05-03-PLAN.md | Caddy configured for HTTPS reverse proxy | SATISFIED | docs/caddy-setup.md provides exact Caddyfile with tls internal + reverse_proxy localhost:3000 + HTTP redirect. Browser exception documented |
| DEPLOY-04 | 05-02-PLAN.md | pm2 keeps server alive across reboots and crashes | SATISFIED | ecosystem.config.js has autorestart: true. docs/pm2-setup.md documents pm2 startup + pm2 save for reboot survival |
| DEPLOY-05 | 05-03-PLAN.md, 05-04-PLAN.md | Deploy script automates future updates | SATISFIED | deploy.sh present with 5-step sequence including npm rebuild. Native module ABI safety confirmed (gap closed in plan 04) |

**Orphaned requirements:** None. All five DEPLOY requirement IDs claimed by plans are accounted for.

### Anti-Patterns Found

None. No TODO/FIXME items, placeholder comments, empty implementations, or incomplete steps found in any phase 5 artifact.

The previously-flagged missing `npm rebuild` step has been resolved.

### Human Verification Required

The following cannot be verified programmatically and require a live VPS:

#### 1. End-to-End HTTPS Access

**Test:** Provision a fresh Ubuntu 22.04 VPS. Run setup.sh, configure .env, build the app (npm ci → npm rebuild → npm run build), start via `pm2 start ecosystem.config.js`, apply the Caddyfile from docs/caddy-setup.md.
**Expected:** Browser can reach `https://<vps-ip>/` after accepting the self-signed cert warning. Login screen appears. Session can be created and Claude Code runs.
**Why human:** Requires an actual VPS, live Caddy process, pm2 process, and browser interaction with the TLS warning flow.

#### 2. pm2 Reboot Survival

**Test:** After completing pm2 startup + pm2 save per docs/pm2-setup.md, reboot the VPS. Wait 30 seconds.
**Expected:** `pm2 status` shows claude-vps-interface as online without manual intervention.
**Why human:** Requires a VPS reboot cycle. PITFALLS.md notes a known failure mode with nvm (Pitfall 2) — the current setup uses NodeSource (system install) which avoids this, but reboot survival must be confirmed live.

#### 3. WebSocket Proxying Through Caddy

**Test:** With the Caddyfile as documented, open a terminal session in the web UI.
**Expected:** xterm.js connects via WebSocket through Caddy's reverse proxy. Terminal output appears and input is relayed. No 502 or WS upgrade failures.
**Why human:** WebSocket upgrade behavior through Caddy's reverse_proxy depends on runtime behavior that cannot be verified statically.

### Gap Closure Confirmation

The single gap from the previous verification pass is now closed:

**Gap (closed):** `deploy.sh` missing `npm rebuild` between `npm ci` and `npm run build`

Plan 05-04 delivered exactly what was specified. deploy.sh now runs a 5-step sequence (git pull → npm ci → npm rebuild → npm run build → pm2 reload). The `set -euo pipefail` shebang ensures a failing `npm rebuild` halts the script before pm2 reload — the running process stays up on a failed deploy.

docs/vps-setup.md section 4 mirrors the deploy script sequence and names node-pty and bcrypt as the native modules, explains ABI matching, and cross-references deploy.sh as the place that runs this automatically.

Both commits are present in git history: `1452d48` (deploy.sh) and `414799f` (docs/vps-setup.md).

**All 12 must-haves are fully satisfied.** The six files (setup.sh, docs/vps-setup.md, ecosystem.config.js, docs/pm2-setup.md, deploy.sh, docs/caddy-setup.md) exist, contain substantive content matching the plan specifications, and are correctly cross-referenced.

---

_Verified: 2026-04-06T15:10:00Z_
_Verifier: Claude (gsd-verifier)_
