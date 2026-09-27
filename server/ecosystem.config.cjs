module.exports = {
  apps: [{
    name: 'tokenbike-api',
    script: 'node_modules/.bin/tsx',
    args: 'src/index.ts',
    cwd: __dirname,
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    max_memory_restart: '300M',
    env: { NODE_ENV: 'production' },
  }],
};
