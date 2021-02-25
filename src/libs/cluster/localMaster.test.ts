import { Bridge, PktData } from "./bridge";
import { initClient } from "./client";
import { LocalMaster } from "./localMaster";

process.env.BRIDGE_TESTING = "true";

describe("master to client comms", () => {

  test("client callback is called on master message", async () => {

    const mock = new LocalMaster();

    const cb = jest.fn((data: PktData, reply: (data: PktData) => void) => {

      if (data.msg === "ping") {
        data.msg = "pong";
        reply(data);
        return true;
      }

      return false;
    });

    mock.client.addCallback(cb);
    const resp = await mock.master.send("ping", 0, 0);
    expect(resp.msg).toEqual("pong");
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("master can ping client", async () => {
    const client = initClient();
    const master: Bridge = Object(client).master; // hack for unit testing
    expect(master).toBeInstanceOf(Bridge);

    let resp: PktData;
    try {
      resp = await master.send("ping", 0, 0);
    } catch (err) {
      console.error("master.send throws 1", err.stack || err);
      throw err;
    }
    expect(typeof resp).toEqual("object");
    expect(resp.error).toBeUndefined();
    expect(resp.msg).toEqual("pong");
  });

  test("master unknown msg to client should error", async () => {

    const client = initClient();
    const master: Bridge = Object(client).master; // hack for unit testing
    expect(master).toBeInstanceOf(Bridge);

    let resp: PktData;
    try {
      resp = await master.send({ msg: "junk" as "ping" }, 0, 0);
    } catch (err) {
      console.error("master.send throws 2", err.stack || err);
      throw err;
    }
    expect(typeof resp).toEqual("object");
    expect(resp.error).toEqual("junk unknown");
  });

  test("master sending mismatch should throw", async () => {

    const client = initClient();
    const master: Bridge = Object(client).master; // hack for unit testing
    expect(master).toBeInstanceOf(Bridge);

    await expect(
      master.send("ping", "master", 0),
    ).rejects.toThrow(/master/);

    await expect(
      master.send("ping", "bcast", 0),
    ).resolves.toBeTruthy();
  });

  test("master signal to client", async () => {

    const cb = jest.fn((_signal: NodeJS.Signals) => { });
    process.once("SIGUSR2", cb);

    const client = initClient();
    const master: Bridge = Object(client).master; // hack for unit testing
    expect(master).toBeInstanceOf(Bridge);

    let resp: PktData;
    try {
      resp = await master.send({ msg: "signal", value: "SIGUSR2" }, 0, 0);
    } catch (err) {
      console.error("master.send throws 3", err.stack || err);
      throw err;
    }

    expect(typeof resp).toEqual("object");
    expect(resp.error).toBeFalsy();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("positive: master should answer apm request", async () => {

    const client = initClient();
    expect(client).toBeInstanceOf(Bridge);

    let resp: PktData;
    try {
      resp = await client.send("apm");
    } catch (err) {
      console.error("client.send throws", err.stack || err);
      throw err;
    }
    expect(typeof resp).toEqual("object");
    expect(resp.error).toBeUndefined();
    expect(resp.msg).toEqual("apm");
    expect(typeof resp.apm).toEqual("object");
  });
});
