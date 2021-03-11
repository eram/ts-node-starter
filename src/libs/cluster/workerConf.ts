import os from "os";
import * as path from "path";
import { assert } from "../../utils";

export class WorkerConf {

  static readonly WD_TIMEOUT_RESTART = Number(process.env.WD_TIMEOUT_RESTART) || 10_001;
  static readonly WD_CHECK_INTERVAL = Number(process.env.WD_CHECK_INTERVAL) || 5_000;

  /*
   * params from pm2 ecosystem file: pm2.config.js
   * see https://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  /* eslint-disable @typescript-eslint/naming-convention */
  name: string;                         // app name
  script: string;                       // script to run: TS or JS file
  cwd: string;                          // current dir when launching script
  args: string;                         // commandline params
  instances: number;                    // number of workers to run. max = cpu count
  autorestart: boolean;                 // auto restart if worker exit code is not 0
  max_restarts: number;                 // max restart before giveup

  wait_ready: boolean;                  // check that the worker starts listening
  listen_timeout: number;               // kill worker if not started listening by this timeout
  restart_delay: number;                // restart after X milliseconds
  exp_backoff_restart_delay: number;    // further restart delay increased by

  kill_timeout: number;                 // timeout to kill the an unhealthy worker
  max_memory_restart: number | string;  // max memory usage for a healthy worker: "50K"/"1024M"/"1G"
  time: boolean;                        // add time to logs

  pid_file: string;                     // dir for pid files. filename "<app_name>-<worker_id>.pid"
  out_file: string;                     // stdout file. file name is suffixed with worker id
  error_file: string;                   // stderr file. file name is suffixed with worker id
  combine_logs: boolean;                // if true log files are combined (no worker id suffix)
  /* eslint-enable @typescript-eslint/naming-convention */

  /* these features are not implemented */
  // shutdown_with_message: boolean;    // send worker a SIGTERM or terminate it
  // interpreter: “/usr/bin/python”;
  // interpreter_args: ”–harmony”;
  // watch: ["src"];
  // ignore_watch: [];
  // source_map_support: true;
  // instance_var: "PM2_INSTANCE";
  // min_uptime: 0;
  // env: { };
  // env_xxx: { };
  // filter_env: [];
  // cron_restart: “1 0 * * *”;
  // vizion: false;
  // post_update: [];
  // force: true;
  // log_date_format: “YYYY-MM-DD HH:mm Z”;

  constructor(obj: Readonly<Partial<WorkerConf>>) {

    const numCPUs = os.cpus().length;

    if (!obj.name) throw new Error("name field is required for app");
    this.name = String(obj.name);
    if (!obj.script) throw new Error("script field is required for app");
    this.script = String(obj.script);
    this.cwd = path.resolve(String(obj.cwd || "."));
    this.args = Array.isArray(obj.args) ? obj.args.join(" ") : String(obj.args);
    let instances = Number(obj.instances) || 1;
    instances = (instances < 0) ? numCPUs - 1 : ((instances === 0) ? numCPUs : Math.min(numCPUs, instances));
    this.instances = instances;
    this.autorestart = Boolean(obj.autorestart);
    this.max_restarts = Number(obj.max_restarts) || 0;
    this.wait_ready = Boolean(obj.wait_ready);
    this.listen_timeout = Number(obj.listen_timeout) || 0;
    this.restart_delay = Number(obj.restart_delay) || 1000;
    this.exp_backoff_restart_delay = Number(obj.exp_backoff_restart_delay) || 1000;
    this.kill_timeout = Math.max(Number(obj.kill_timeout), WorkerConf.WD_TIMEOUT_RESTART);
    this.max_memory_restart = WorkerConf.toMB(String(obj.max_memory_restart || "00").toUpperCase());
    this.time = Boolean(obj.time);
    this.pid_file = String(obj.pid_file || "");
    this.out_file = String(obj.out_file || "");
    this.error_file = String(obj.error_file || "");
    this.combine_logs = Boolean(obj.combine_logs !== undefined ? obj.combine_logs : Object(obj).merge_logs);

    if (!this.script.toLocaleLowerCase().endsWith(".js") && !this.script.toLocaleLowerCase().endsWith(".ts")) {
      this.script = path.join(this.script, "index.ts");
    }
  }

  static toMB(mem: string) {
    let num = Number(mem.substr(0, mem.length - 1)) || 0;
    const s = mem.substr(mem.length - 1, 1);
    switch (s) {
      case "K": num *= 1024; break; // KB
      case "M": num *= 1024 * 1024; break; // MB
      case "G": num *= 1024 * 1024 * 1024; break; // GB
      default:
        assert(Number.parseInt(s) >= 0, "max_memory_restart must be a decimal number or appended with 'K', 'M' or 'G'");
        num = num * 10 + Number.parseInt(s);
    }
    return num / 1024 / 1024;
  }
}


export enum WorkerState { init, online, listening, pinging, disconnected }

export class WorkerInfo {

  lastUpdate = Date.now();
  lastMem = 0;
  lastCpu = 0;

  private _state: WorkerState;

  constructor(
    public idx: number,
    public restarts = 0,
  ) {
    this.state = WorkerState.init;
  }

  set state(state: WorkerState) {
    this._state = state;
    this.lastUpdate = Date.now();
  }

  get state() { return this._state; }
}
