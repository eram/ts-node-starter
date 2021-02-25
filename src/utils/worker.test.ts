import * as path from "path";
import { Worker } from "./worker";

describe("ts-node worker", () => {
  test("run a worker", (done) => {
    const worker = new Worker(path.resolve(__dirname, "__mocks__/exit.ts"), {});

    worker.on("exit", (_code) => {
      console.log("on exit");
      done();
    });
  });
});
