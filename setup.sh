#!/usr/bin/env bash
set -euo pipefail

echo "=== Claude VPS Interface — VPS Setup ==="
echo "Target: Ubuntu 22.04 LTS"
echo ""

# 1. System packages
echo "[1/6] Installing system packages..."
sudo apt-get update -y
sudo apt-get install -y git curl build-essential python3

# 2. Node.js 20 via NodeSource
echo "[2/6] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version

# 3. pm2
echo "[3/6] Installing pm2..."
sudo npm install -g pm2

# 4. Caddy via official apt repo
echo "[4/6] Installing Caddy..."
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update -y
sudo apt-get install -y caddy

# 5. Firewall — allow SSH, HTTP, HTTPS only
echo "[5/6] Configuring firewall (ufw)..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status

# 6. Done
echo ""
echo "[6/6] Setup complete."
echo ""
echo "NEXT STEPS:"
echo "  1. Install Claude Code per Anthropic docs: https://docs.anthropic.com/en/docs/claude-code"
echo "  2. Copy .env.example to .env and fill in PASSWORD, JWT_SECRET, PORT, CLAUDE_CMD"
echo "  3. Run 'npm ci && npm run build' to build the app"
echo "  4. Follow docs/vps-setup.md to configure pm2 and Caddy"
