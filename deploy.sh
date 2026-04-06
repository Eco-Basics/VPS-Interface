#!/usr/bin/env bash
set -euo pipefail

# deploy.sh — Update the Claude VPS Interface to the latest git commit.
# Run this script on the VPS: SSH in, then run ./deploy.sh
#
# What this does:
#   1. Pull latest code from git
#   2. Install/update dependencies (npm ci — reproducible, uses package-lock.json)
#   3. Compile TypeScript (npm run build → dist/)
#   4. Zero-downtime reload via pm2 (new process starts before old one dies)
#
# What this does NOT do:
#   - Touch environment secrets (set-and-forget after initial setup)
#   - Run database migrations (no database in this project)
#   - Restart Caddy (Caddy config is separate)

APP_NAME="claude-vps-interface"

echo "=== Deploy: $APP_NAME ==="
echo ""

echo "[1/4] Pulling latest code..."
git pull

echo "[2/4] Installing dependencies..."
npm ci

echo "[3/4] Building..."
npm run build

echo "[4/4] Reloading pm2 process (zero-downtime)..."
pm2 reload "$APP_NAME"

echo ""
echo "Deploy complete. Check status with: pm2 status"
