import { WorkerConf, WorkerInfo, WorkerState } from "./workerConf";

describe("WrokerInfo", () => {

  test("WorkerConf invalid", () => {
    expect(() => {
      new WorkerConf({ instances: 1 });
    }).toThrow();
  });


  test("WorkerConf setup", () => {

    const conf = {
      name: "test",               // app name
      script: __filename,         // script to run: TS or JS file
      args: "",                   // commandline params
      instances: 1,               // number of workers to run. max = cpu count
      autorestart: false,         // auto restart if worker exit code is not 0
      max_memory_restart: "1G" as unknown as number, // eslint-disable-line
    };

    const app = new WorkerConf(conf);
    expect(app).toBeInstanceOf(WorkerConf);
  });

  test("WorkerConf setup", () => {
    const conf = {
      name: "test",               // app name
      script: __filename,         // script to run: TS or JS file
      instances: 100,             // number of workers to run. max = cpu count
      kill_timeout: 10,           // eslint-disable-line
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
});