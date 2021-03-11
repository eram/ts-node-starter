import { sleep } from "../../utils";
import { Bridge } from "./bridge";
import { initClient } from "./client";
import * as Plugin from "./plugin";

process.env.BRIDGE_TESTING = "true";

describe("plugin loader", () => {


  test("plugin on master", async () => {

    const length = Plugin.plugins.length;
    const client = initClient();
    const resp = await client.send({ msg: "plugin", value: __filename }, "master");
    expect(typeof resp).toEqual("object");
    expect(resp.error).toBeFalsy();

    await sleep(1);

    expect(Object(client).master?.initPluginCalled).toBeTruthy();
    expect(Plugin.plugins.length).toEqual(length + 1);
  });

  test("plugin on client", async () => {

    const length = Plugin.plugins.length;
    const client = initClient();
    const master = Object(client).master as Bridge;
    const resp = await master.send({ msg: "plugin", value: __filename }, 0);
    expect(typeof resp).toEqual("object");
    expect(resp.error).toBeFalsy();

    await sleep(1);

    expect(Object(client).initPluginCalled).toBeTruthy();
    expect(Plugin.plugins.length).toEqual(length + 1);
  });

});


class TestPlugin extends Plugin.PluginBase {
  async init() {
    Object(this.bridge).initPluginCalled = true;
    return super.init();
  }
}


// function is used by the 'require' test above
export const initPlugin: Plugin.InitPluginFn = async (opts: Partial<Plugin.PluginParams>) => {
  try {
    const plugin = new TestPlugin(opts);
    const rc = await plugin.init();
    if (!rc) throw new Error("init failed");
    return plugin;
  } catch (err) {
    console.error("plugin error:", err.message || err);
    return undefined;
  }
};

