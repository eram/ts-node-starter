import { initMaster } from "./master";
import { LocalMaster } from "./localMaster";

describe("bridge master", () => {

  test("ping-pong msg to master", async () => {

    const mock = new LocalMaster();
    const cb = jest.fn(mock.master.addCallback);
    mock.master.addCallback = cb;

    initMaster(mock.master);
    expect(cb).toHaveBeenCalledTimes(1);

    const resp = await mock.client.send("ping", "master", 0);
    expect(typeof resp).toEqual("object");
    expect(resp.msg).toEqual("pong");
    expect(resp.error).toBeUndefined();
  });

  test("signal msg to master", async () => {

    const cb = jest.fn((_signal: NodeJS.Signals) => { });
    process.once("SIGUSR2", cb);

    const mock = new LocalMaster();
    initMaster(mock.master);
    const resp = await mock.client.send({ msg: "signal", value: "SIGUSR2" }, "master", 0);
    expect(typeof resp).toEqual("object");
    expect(resp.error).toBeFalsy();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("unknown msg to master", async () => {

    const mock = new LocalMaster();
    initMaster(mock.master);
    const resp = await mock.client.send("junk" as never, "master", 0);
    expect(typeof resp).toEqual("object");
    expect(resp.error).toBeTruthy();
    expect(resp.error).toEqual("junk unknown");
  });
});

