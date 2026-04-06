# Roadmap: Claude VPS Interface

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-04-03)
- 🚧 **v1.1 VPS Deployment** — Phase 5 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) — SHIPPED 2026-04-03</summary>

- [x] **Phase 1: Backend Foundation** — Auth, PTY spawning, session registry (4/4 plans) — completed 2026-04-01
- [x] **Phase 2: Session Engine** — WebSocket bridge, ring buffer, reconnect, REST API (4/4 plans) — completed 2026-04-02
- [x] **Phase 3: Terminal UI** — xterm.js frontend, tab management, responsive layout (4/4 plans) — completed 2026-04-02
- [x] **Phase 4: Shell & Launcher** — Bash shell tab, saved directories, session naming (2/2 plans) — completed 2026-04-03

Full archive: `.planning/milestones/v1.0-ROADMAP.md`

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Backend Foundation | v1.0 | 4/4 | Complete | 2026-04-01 |
| 2. Session Engine | v1.0 | 4/4 | Complete | 2026-04-02 |
| 3. Terminal UI | v1.0 | 4/4 | Complete | 2026-04-02 |
| 4. Shell & Launcher | v1.0 | 2/2 | Complete | 2026-04-03 |
| 5. VPS Deployment | 2/3 | In Progress|  | — |

### Phase 5: VPS Deployment

**Goal:** Deploy the app to a real VPS — accessible via HTTPS, always-on via pm2, and updatable via a single deploy script.

**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, DEPLOY-05
**Depends on:** Phase 4 (v1.0 complete)
**Plans:** 2/3 plans executed

Plans:
- [ ] 05-01-PLAN.md — VPS provisioning: setup.sh + docs/vps-setup.md (DEPLOY-01)
- [ ] 05-02-PLAN.md — pm2 config: ecosystem.config.js + docs/pm2-setup.md (DEPLOY-02, DEPLOY-04)
- [ ] 05-03-PLAN.md — Caddy HTTPS + deploy script: deploy.sh + docs/caddy-setup.md (DEPLOY-03, DEPLOY-05)
