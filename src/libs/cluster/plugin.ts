import { Sequelize } from "../../models";
import { copyIn, createLogger } from "../../utils";
import { Bridge } from "./bridge";


export const plugins = new Array<PluginBase>();

export class PluginParams {
  readonly name = this.constructor.name;
  readonly logger = createLogger(this.name, createLogger().level);
  readonly db?: Sequelize;
  readonly bridge?: Bridge;
}

export abstract class PluginBase extends PluginParams {

  initialized = false;

  constructor(opts: Partial<PluginParams>) {
    super();
    copyIn<PluginBase>(this, opts);
    plugins.push(this);
  }

  async init() {
    this.initialized = true;
    console.info(`plugin ${this.name} initialzed on ${this.bridge.id}`);
    return true;
  }
}

// the plugin main file must implement a InitPluginFn function.
// here is an example of such implementation:
/* istanbul ignore next */
export const initPlugin = async (_opts: Partial<PluginParams>) => {
  try {
    let plugin: PluginBase;
    /* ------BasePlugin is abstract------------
    plugin = new PluginBase(opts);
    const rc = await plugin.init();
    if (!rc) throw new Error("plugin init failed");
    -------------------- */
    return plugin;
  } catch (err) {
    console.error("plugin error:", err.message || err);
    return undefined;
  }
};

export type InitPluginFn = typeof initPlugin;
