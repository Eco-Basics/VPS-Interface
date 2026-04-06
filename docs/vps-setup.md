# VPS Setup Guide

One-time setup for a fresh Ubuntu 22.04 LTS VPS. Run once before deploying the app.

## Prerequisites

- A fresh Ubuntu 22.04 LTS VPS
- SSH access as a user with sudo privileges
- The repo cloned to the VPS (e.g. `git clone <repo-url> ~/claude-vps-interface`)

## 1. Run setup.sh

From the cloned repo directory:

    chmod +x setup.sh
    ./setup.sh

This installs: git, build-essential, python3, Node.js 20, npm, pm2, Caddy, and configures ufw firewall (ports 22/80/443 only).

## 2. Install Claude Code

Claude Code is installed separately per Anthropic's official instructions:
https://docs.anthropic.com/en/docs/claude-code

Verify installation: `claude --version`

## 3. Create .env

The `.env` file is NOT committed to git. Create it manually on the VPS:

    cp .env.example .env
    nano .env

Required values:

| Variable | Description | Example |
|----------|-------------|---------|
| PASSWORD | Login password for the web UI | a-strong-password |
| JWT_SECRET | 64-char random hex string | generate with: openssl rand -hex 32 |
| PORT | Port the Node.js app listens on | 3000 |
| CLAUDE_CMD | Claude Code binary name or path | claude |
| ALLOWED_COMMANDS | Comma-separated list of allowed bash commands | bash,ls,cat,git |

Generate a JWT_SECRET:

    openssl rand -hex 32

The `.env` file is set-and-forget. The deploy script does NOT modify it.

## 4. Build the app

    npm ci
    npm run build

This compiles TypeScript to `dist/`. Requires all dependencies including devDependencies (TypeScript compiler).

## 5. Configure pm2

See docs/pm2-setup.md (created in Plan 02).

## 6. Configure Caddy

See docs/caddy-setup.md (created in Plan 03).

## Firewall Summary

| Port | Protocol | Access | Purpose |
|------|----------|--------|---------|
| 22 | TCP | Public | SSH |
| 80 | TCP | Public | HTTP → Caddy redirects to 443 |
| 443 | TCP | Public | HTTPS (Caddy) |
| 3000 | TCP | Internal only | Node.js app (NOT exposed) |

Port 3000 is blocked by ufw. Caddy proxies from 443 → localhost:3000 internally.
