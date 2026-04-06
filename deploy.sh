#!/usr/bin/env bash
set -euo pipefail

# deploy.sh — Update the Claude VPS Interface to the latest git commit.
# Run this script on the VPS: SSH in, then run ./deploy.sh
#
# What this does:
#   1. Pull latest code from git
#   2. Install/update dependencies (npm ci — reproducible, uses package-lock.json)
#   3. Recompile native modules for current Node.js ABI (npm rebuild)
#   4. Compile TypeScript (npm run build → dist/)
#   5. Zero-downtime reload via pm2 (new process starts before old one dies)
#
# What this does NOT do:
#   - Touch environment secrets (set-and-forget after initial setup)
#   - Run database migrations (no database in this project)
#   - Restart Caddy (Caddy config is separate)

APP_NAME="claude-vps-interface"

echo "=== Deploy: $APP_NAME ==="
echo ""

echo "[1/5] Pulling latest code..."
git pull

echo "[2/5] Installing dependencies..."
npm ci

echo "[3/5] Rebuilding native modules..."
npm rebuild

echo "[4/5] Building..."
npm run build

echo "[5/5] Reloading pm2 process (zero-downtime)..."
pm2 reload "$APP_NAME"

echo ""
echo "Deploy complete. Check status with: pm2 status"
