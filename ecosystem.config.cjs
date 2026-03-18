module.exports = {
  apps: [
    {
      name: 'sportrun-api',
      cwd: './server',
      script: './node_modules/.bin/tsx',
      args: 'src/index.ts',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      max_memory_restart: '400M',
      error_file: '../logs/api-error.log',
      out_file: '../logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
