module.exports = {
  apps: [
    {
      name: 'odcm-backend',
      cwd: '/home/ods/odcms.officedataghana.com/Backend',
      script: 'app.js',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'odcm-frontend',
      cwd: '/home/ods/odcms.officedataghana.com/Frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};