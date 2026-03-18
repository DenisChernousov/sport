module.exports = {
  apps: [
    {
      name: 'sportrun-api',
      cwd: './server',
      script: 'npx',
      args: 'tsx src/index.ts',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
