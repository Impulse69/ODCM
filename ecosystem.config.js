module.exports = {
  apps: [
    {
      name: 'odcm-backend',
      cwd: './Backend',
      script: 'app.js',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'odcm-frontend',
      cwd: './Frontend',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
