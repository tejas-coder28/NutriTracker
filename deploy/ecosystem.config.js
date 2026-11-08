module.exports = {
  apps: [
    {
      name: 'nutritrack-backend',
      script: './backend/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        DB_PATH: './backend/nutritrack.sqlite',
        UPLOADS_DIR: './backend/uploads'
      }
    }
  ]
};
