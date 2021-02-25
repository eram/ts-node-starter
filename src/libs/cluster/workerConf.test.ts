/* eslint-disable @typescript-eslint/naming-convention */
import { WorkerConf, WorkerInfo, WorkerState } from "./workerConf";

describe("WrokerInfo", () => {

  test("WorkerConf invalid", () => {
    expect(() => new WorkerConf({ instances: 1 })).toThrow(/name/);
  });


  test("WorkerConf setup", () => {

    const conf: Partial<WorkerConf> = {
      name: "test",
      script: __filename,
      args: "",
      instances: 1,
      autorestart: false,
      max_memory_restart: "1G",
    };

    const app = new WorkerConf(conf);
    expect(app).toBeInstanceOf(WorkerConf);
  });


  test("WorkerConf setup", () => {

    const conf: Partial<WorkerConf> = {
      name: "test", // app name
      script: __filename, // script to run: TS or JS file
      instances: 100, // number of workers to run. max = cpu count
      kill_timeout: 10,
    };

    const app = new WorkerConf(conf);
    expect(app).toBeInstanceOf(WorkerConf);
    expect(app.instances).toBeLessThan(conf.instances);
    expect(app.kill_timeout).toBeGreaterThan(conf.kill_timeout);
  });


  test("WorkerInfo state", () => {
    const info = new WorkerInfo(1);
    expect(info).toBeInstanceOf(WorkerInfo);
    info.state = WorkerState.pinging;
    expect(info.state).toEqual(WorkerState.pinging);
  });

  test("WorkerConf throws invalid max_memory_restart", () => {
    const conf: Partial<WorkerConf> = {
      name: "test", // app name
      script: __filename, // script to run: TS or JS file
      max_memory_restart: "100KB",
    };
    expect(() => new WorkerConf(conf)).toThrow(/max_memory_restart/);
  });
});
