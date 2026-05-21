module.exports = {
  apps: [
    {
      name: 'wikigouv-api',
      cwd: '/www/wwwroot/wikigouv.gouvgpt.com/apps/api',
      script: 'dist/main.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_restarts: 15,
      restart_delay: 2000,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      out_file: '/www/wwwroot/wikigouv.gouvgpt.com/logs/api/pm2-out.log',
      error_file: '/www/wwwroot/wikigouv.gouvgpt.com/logs/api/pm2-error.log',
      merge_logs: true
    },
    {
      name: 'wikigouv-web',
      cwd: '/www/wwwroot/wikigouv.gouvgpt.com/apps/web',
      script: 'dist/main.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_restarts: 15,
      restart_delay: 2000,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      out_file: '/www/wwwroot/wikigouv.gouvgpt.com/logs/web/pm2-out.log',
      error_file: '/www/wwwroot/wikigouv.gouvgpt.com/logs/web/pm2-error.log',
      merge_logs: true
    }
  ]
};
