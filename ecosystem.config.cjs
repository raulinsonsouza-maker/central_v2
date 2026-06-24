/** @type {import('pm2').StartOptions} */
module.exports = {
  apps: [
    {
      name: "central-inout",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -H 0.0.0.0",
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
        PORT: "5000",
      },
      autorestart: true,
      max_memory_restart: "400M",
      time: true,
    },
  ],
};
