# pm2 Setup Guide

pm2 manages the Node.js process: auto-restart on crash, zero-downtime reload, and reboot survival.

## First-Time Registration

Run these commands once after the initial deploy (see docs/vps-setup.md for initial build steps):

    # Start the app for the first time
    pm2 start ecosystem.config.js

    # Verify it's running
    pm2 status

    # Configure pm2 to start on system reboot
    pm2 startup
    # ^ This prints a command like: sudo env PATH=... pm2 startup systemd -u root --hp /root
    # Copy and run that exact command

    # Save the current process list (so pm2 reloads it on reboot)
    pm2 save

After `pm2 save`, the app will automatically restart after any system reboot.

## Log Access

    # Live log tail
    pm2 logs claude-vps-interface

    # Last 100 lines
    pm2 logs claude-vps-interface --lines 100

    # Error log only
    tail -f ~/.pm2/logs/claude-vps-interface-error.log

## Restart vs Reload

| Command | Behaviour | When to use |
|---------|-----------|-------------|
| `pm2 reload claude-vps-interface` | Zero-downtime: new process starts before old one dies | Normal deploys (used by deploy.sh) |
| `pm2 restart claude-vps-interface` | Hard restart: brief downtime | After ecosystem.config.js changes |
| `pm2 stop claude-vps-interface` | Stop without removing | Temporary maintenance |
| `pm2 delete claude-vps-interface` | Remove from pm2 list | Deregistration only |

## Status Check

    pm2 status
    pm2 show claude-vps-interface

## After Editing ecosystem.config.js

If you modify `ecosystem.config.js` (e.g., change cwd or memory limit):

    pm2 restart ecosystem.config.js
    pm2 save

Use `pm2 restart` (not reload) when the config file itself changes.
