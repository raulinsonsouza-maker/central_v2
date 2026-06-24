/** @type {import('pm2').StartOptions} */
module.exports = {
  apps: [
    {
      name: "central-inout",
      cwd: __dirname,
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      time: true,
    },
  ],
};
