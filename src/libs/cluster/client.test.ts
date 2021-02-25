import { Bridge, PktData } from "./bridge";
import { initClient } from "./client";

process.env.BRIDGE_TESTING = "true";

describe("bridge client tests", () => {

  test("positive: ping should answer pong", async () => {
    const client = initClient();
    expect(client).toBeInstanceOf(Bridge);

    let resp: PktData;
    try {
      resp = await client.send("ping", "master", 0);
    } catch (err) {
      console.error("client.send throws", err.stack || err);
      throw err;
    }

    expect(typeof resp).toEqual("object");
    expect(resp.error).toBeUndefined();
    expect(resp.msg).toEqual("pong");
  });

  test("client should answer apm request", async () => {

    const client = initClient();
    expect(client).toBeInstanceOf(Bridge);
    const master = Object(client).master as Bridge;

    let resp: PktData;
    try {
      resp = await master.send("apm", client.id);
    } catch (err) {
      console.error("master.send throws", err.stack || err);
      throw err;
    }

    expect(typeof resp).toEqual("object");
    expect(resp.error).toBeUndefined();
    expect(resp.msg).toEqual("apm");
    expect(typeof resp.apm).toEqual("object");
  });

  test("client invalid data should throw", async () => {
    const client = initClient();
    expect(client).toBeInstanceOf(Bridge);

    await expect(
      client.send({} as PktData, "master", 0),
    ).rejects.toThrow(/invalid/);

    await expect(
      client.send(undefined, "master", 0),
    ).rejects.toThrow(/invalid/);
  });

  test("client unknown msg should error", async () => {

    const client = initClient();

    const resp = await client.send("junk" as never, "master", 0);

    expect(typeof resp).toEqual("object");
    expect(resp.error).toEqual("junk unknown");
  });

  test("client timeout should throw", async () => {

    const client = initClient();

    // hack the port's send function with a dev-null function to cause a timeout
    const port = Object(client)._port; // type IPort
    const fnDevNull = jest.fn((_pkt: unknown) => { });
    port.send = fnDevNull;

    await Promise.all([
      expect(
        client.send("should timeout 1" as never, "master", 1),
      ).rejects.toThrow(/timeout/),
      expect(
        client.send("should timeout 2" as never, "master", 1),
      ).rejects.toThrow(/timeout/),
    ]);

    expect(fnDevNull).toHaveBeenCalledTimes(2);
  });

  test("client multiple requests should all succeed", async () => {

    const client = initClient();
    const arr = new Array<Promise<PktData>>();

    while (arr.length < 10) {
      arr.push(client.send("ping", "master", 0));
    }

    await Promise.all(arr).catch(reason => {
      throw Error(reason);
    });

    arr.forEach(p => {
      p.then(pkt => {
        expect(pkt.msg).toEqual("pong");
        expect(pkt.error).toBeFalsy();
      }, reason => {
        throw new Error(reason);
      });
    });
  });

  test("client sending mismatch should throw", async () => {

    const client = initClient();

    await expect(
      client.send("ping", 0, 0),
    ).rejects.toThrow(/this/);

    await expect(
      client.send("ping", "bcast", 0),
    ).resolves.toBeTruthy();
  });

  test("client post", () => {
    const client = initClient();
    client.post("ping", "master");

    client.post({} as PktData, "master"); // coverage!
  });

  test("client remove callback", () => {
    const client = initClient();
    const cb = () => false;
    client.addCallback(cb);

    expect(client.removeCallback(cb)).toBeTruthy();
    expect(client.removeCallback(cb)).toBeFalsy();
    expect(client.removeCallback()).toBeFalsy();
  });
});
