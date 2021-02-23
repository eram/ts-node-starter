import Koa from "koa";
import { initClient } from "../../libs/cluster";
import { initDb } from "../../models";
import { setupKoa } from "./setupKoa";
import { env } from "../../utils";
import { IncomingMessage, ServerResponse } from "http";
import { Socket } from "net";

describe("setupKoa tests", () => {
  it("Koa srv created", () => {

    // hack to get a bit more coverage
    process.env.NODE_ENV = "production";
    delete Object(env).__proto__.isDebugging;
    Object(env).isDebugging = false;

    const srv = setupKoa(new Koa(), initClient(), initDb());
    expect(srv.middleware.length).toBeGreaterThan(7);
    expect(srv.listenerCount("")).toEqual(0);

    // run a request thru the server
    const req = new IncomingMessage(new Socket());
    req.url = "localhost:8080/";
    req.method = "GET";
    const resp = new ServerResponse(req);
    srv.callback()(req, resp);
    expect(resp.statusCode).toEqual(404);
  });
});
