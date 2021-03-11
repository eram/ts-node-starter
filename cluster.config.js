/*
 * params from pm2 ecosystem file: pm2.config.js
 * see https://pm2.keymetrics.io/docs/usage/application-declaration/
 */
/* eslint-disable @typescript-eslint/naming-convention */

module.exports = {
  apps: [
    {
      name: "server",
      script: "src/jobs/app",
      args: "",
      instances: 2, // "max" for best performance of most apps
      autorestart: true,
      listen_timeout: 10000,
      max_memory_restart: "1G",
      restart_delay: 1000,
      max_restarts: 100,
      exp_backoff_restart_delay: 200,
      kill_timeout: 2000,
      wait_ready: true,
      time: false,
      // pid_file: "./logs/pid",
      // out_file: "./logs/app.log",
      // error_file: "./logs/app.log",
      // combine_logs: false,

      /** * unsupported params ** */
      // shutdown_with_message: true,
      // exec_mode: "cluster",
      // min_uptime: 1000,
      // cron_restart: "1 0 * * *"
      // vizion: false
      // post_update: false
      // force: false
      // watch: ["src"],
      // ignore_watch: []
      // source_map_support: true,
      // instance_var: "PM2_ID",
      // log_date_format: “YYYY-MM-DD HH:mm Z”
      // env: { NODE_ENV: "local", },
      // env_xxx: { }
      // filter_env: []
    },
  ],
  // deploy: {},
};
