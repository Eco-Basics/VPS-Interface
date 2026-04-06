# Phase 5: VPS Deployment - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy the v1.0 app to a VPS so it is accessible via HTTPS, always-on via pm2, and updatable via a single deploy script. No new features — this phase is purely operational. Covers: DEPLOY-01 through DEPLOY-05.

</domain>

<decisions>
## Implementation Decisions

### HTTPS & Reverse Proxy (DEPLOY-03)
- **No custom domain** — user accesses the app by VPS IP address
- Caddy configured with `tls internal` — auto-generates a self-signed cert using Caddy's built-in CA
- Browser shows a security warning on first visit; user adds a browser exception once
- All traffic is still TLS-encrypted end-to-end (not plain HTTP)
- Caddy listens on port 443 (public), proxies to the Node.js app on port 3000 (internal only)
- Port 3000 is NOT exposed publicly — firewall blocks it; only Caddy faces the internet
- Security baseline: HTTPS + JWT auth on every route = adequate for personal-use tool

### Process Management (DEPLOY-04)
- pm2 manages the Node.js process (`npm start` → `node dist/src/server.js`)
- `pm2 startup` + `pm2 save` ensures pm2 and the app restart automatically on reboot
- pm2 app name: `claude-vps-interface`
- Use `pm2 ecosystem.config.js` for configuration (not bare CLI flags) — version-controllable

### Code Transfer & Build (DEPLOY-01, DEPLOY-02)
- App lives in a git-cloned repo on the VPS
- `npm ci` (not `npm install`) on the VPS — uses package-lock.json for reproducible installs
- TypeScript must be compiled: `npm run build` produces `dist/` before pm2 restarts
- `devDependencies` are needed on the VPS for the build step (TypeScript compiler) — install all deps
- No separate frontend build step — vanilla JS, served as static files from `public/`

### Secrets & Environment (DEPLOY-01)
- `.env` is gitignored and must be created manually on the VPS once during setup
- SCP the local `.env` to the VPS on first deploy, or write it in-place via SSH
- `.env.example` in the repo documents all required vars (`PASSWORD`, `JWT_SECRET`, `PORT`, `ALLOWED_COMMANDS`)
- Deploy script does NOT touch `.env` — it is set-and-forget after initial setup

### Deploy Script (DEPLOY-05)
- Server-side script: user SSHes to VPS, then runs `./deploy.sh` on the VPS
- Script does: `git pull && npm ci && npm run build && pm2 reload claude-vps-interface`
- `pm2 reload` (not `pm2 restart`) — zero-downtime reload: new process starts before old one dies
- Script lives in the project root, committed to git, so it's always available on the VPS after clone
- Script must be executable (`chmod +x deploy.sh`)
- On failure (e.g., build error): pm2 reload is not called — running process stays up

### VPS Environment Setup (DEPLOY-01)
- Install Node.js via NodeSource or nvm — pin to the same major version used in dev (Node 20+)
- Install git, pm2 globally (`npm install -g pm2`)
- Install Caddy via the official Caddy apt/rpm repo or binary download
- Claude Code installation is separate from this app — DEPLOY-01 states it must be installed, but its install procedure is documented by Anthropic (not scripted here)
- Firewall: expose only ports 22 (SSH), 80 (HTTP → Caddy redirects to 443), 443 (HTTPS)

### Claude's Discretion
- Exact Linux distro assumptions in setup instructions (Ubuntu 22.04 LTS is the safe default)
- Exact Caddyfile syntax and location (`/etc/caddy/Caddyfile`)
- pm2 ecosystem.config.js fields and log rotation settings
- Whether to add a `setup.sh` for first-time VPS provisioning (separate from `deploy.sh`)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — DEPLOY-01 through DEPLOY-05 acceptance criteria
- `.planning/PROJECT.md` — Stack constraints, Key Decisions table (Caddy, pm2 decisions)

### Prior Phases
- `.planning/phases/01-backend-foundation/01-CONTEXT.md` — Environment vars (PASSWORD, JWT_SECRET, PORT, ALLOWED_COMMANDS), app entry point
- `package.json` — Scripts: `build` (tsc), `start` (node dist/src/server.js) — deploy script must use these
- `.env.example` — All required environment variables

### No external specs
No ADRs or feature docs beyond PROJECT.md and REQUIREMENTS.md. Caddy and pm2 official docs are the external references for those tools.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `package.json` — `npm run build` (tsc) and `npm start` (node dist/src/server.js) are the build and run commands for the VPS
- `.env.example` — Documents all required environment variables; deploy instructions reference this
- `dist/` — Compiled output; must be regenerated on VPS after each git pull (not committed to git)

### Established Patterns
- App reads env vars via `dotenv/config` imported at server.ts top — `.env` must exist before `npm start`
- Port defaults: check `.env.example` for PORT default (likely 3000)
- No frontend build step — `public/` is served as static files from Express; no compilation needed

### Integration Points
- Caddy → app: Caddy reverse-proxies to `localhost:3000` (or whatever PORT is set in .env)
- pm2 → app: pm2 runs `npm start` (or `node dist/src/server.js` directly) as the managed process
- deploy.sh → pm2: `pm2 reload claude-vps-interface` triggers zero-downtime restart after build

</code_context>

<specifics>
## Specific Ideas

- User explicitly wants "common sense protection and security" even without a domain — met by HTTPS (Caddy internal TLS) + existing JWT auth
- Deploy flow: SSH to VPS → run `./deploy.sh` → done. No local tooling required beyond SSH.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-vps-deployment*
*Context gathered: 2026-04-06*
