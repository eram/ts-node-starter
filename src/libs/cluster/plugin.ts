import { Sequelize } from "../../models";
import { copyIn, getLogger } from "../../utils";
import { Bridge } from "./bridge";


export const plugins = new Array<PluginBase>();

export class PluginParams {
  readonly name = this.constructor.name;
  readonly logger = getLogger(this.name, getLogger().level);
  readonly db?: Sequelize;
  readonly bridge?: Bridge;
}

export class PluginBase extends PluginParams {

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

  async fini() {
    this.initialized = false;
  }
}

// The plugin main file must implement a InitPluginFn function.
// This is an example of such a function
export const initPlugin = async (opts: Partial<PluginParams>) => {
  let plugin: PluginBase;
  try {
    const p = new PluginBase(opts);
    const rc = await p.init();
    if (!rc) throw new Error("init failed");
    plugin = p;
  } catch (err) {
    console.error("plugin error:", err.message || err);
  }
  return plugin;
};

export type InitPluginFn = typeof initPlugin;
