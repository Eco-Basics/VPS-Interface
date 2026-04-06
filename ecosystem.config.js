module.exports = {
  apps: [
    {
      name: 'claude-vps-interface',
      script: 'node',
      args: 'dist/src/server.js',
      cwd: '/root/claude-vps-interface',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: '/root/.pm2/logs/claude-vps-interface-error.log',
      out_file: '/root/.pm2/logs/claude-vps-interface-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
