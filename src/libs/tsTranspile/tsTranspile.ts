//
// this code is based on code from npm express-typescript-compile
// https://github.com/majo44/express-typescript-compile
//
/* eslint-disable @typescript-eslint/naming-convention */
import {
  CompilerOptions,
  CustomTransformerFactory,
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget,
  SourceFile,
  TransformerFactory,
  transpileModule,
  TranspileOptions,
} from "typescript";
import * as path from "path";
import * as fs from "fs";
import { afs, assert, error, info } from "../../utils";
import { createResolver, ResolveOptions } from "./resolver";
import { createImportsTransformer, contextParam, ctxVerify } from "./importsTransformer";


interface CachedValue {
  mtimeMs: number;            // File last update timestamp
  source: string;             // Transpiled code
}

interface Cache<T> {
  reloadSupported: boolean    // check if file was updated before returning from cache
  set: (key: string, value: T) => void;
  get: (key: string) => T | undefined;
  clear: () => void;
}

type Transpiler = (file: string) => Promise<string>;

/**
 * Middleware configuration options.
 * defaults are added to all props in init()
 * @public
 */
export interface TsTranspileOptions {
  dirs: {
    baseFolder: string;               // REQUIRED! code root
    mountPoint: string;               // REQUIRED! URL root corresponding to the baseFolder
    cwd?: string;                     // current directory
  };
  cache?: Cache<CachedValue>;         // cache implementation
  compile?: CompilerOptions;          // Typescript compiler options - tsconfig.json
  resolve?: ResolveOptions;           // dependencies resolver options
  transformers?: Array<TransformerFactory<SourceFile> | CustomTransformerFactory>;
  preloadList?: Array<string>;        // preload ??
  transpiler?: Transpiler;            // custom transpiler
}

const defaultCompilerOptions: CompilerOptions = {
  module: ModuleKind.ES2015,
  target: ScriptTarget.ES2015,
  sourceMap: false,
  emitDecoratorMetadata: true,
  experimentalDecorators: true,
  lib: ["dom"],
  moduleResolution: ModuleResolutionKind.Classic,
  strict: true,
  pretty: true,
  removeComments: false,
  resolveJsonModule: true,
  suppressImplicitAnyIndexErrors: true,
};


export function init(opts: TsTranspileOptions): Required<TsTranspileOptions> {
  const cache = new Map<string, CachedValue>();
  const config: Required<TsTranspileOptions> = {
    dirs: {
      cwd: process.cwd(),
      ...opts.dirs,
    },
    compile: {
      ...defaultCompilerOptions,
      ...opts.compile,
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".cjs", ".mjs"],
      mainFields: ["browser", "module", "import", "jsnext:main", "main"],
      conditionNames: ["browser", "module", "import", "node", "default"],
      ...opts.resolve,
    },
    cache: {
      get: cache.get.bind(cache),
      set: cache.set.bind(cache),
      clear: cache.clear.bind(cache),
      // when code is inside a docker, it requers a re-deployment to change the code.
      // when we debug we want the server to re-transpile if the file has changed.
      reloadSupported: process.env.POD_NAMESPACE === "debug",
      ...opts.cache,
    },
    transformers: opts.transformers || [],
    preloadList: opts.preloadList || [],
    transpiler: opts.transpiler,
  };

  assert(fs.existsSync(config.dirs.cwd), "dirs.cwd invalid");
  assert(fs.existsSync(path.join(config.dirs.cwd, config.dirs.baseFolder)), "dirs.baseFolder invalid");
  assert(config.compile.module > ModuleKind.System,
    "typescript compilerOptions 'module' option is not set to ES module. "
    + "this will cause a problem with the script loading to the browser. "
    + "please use 'ES2015', 'ES2020', or 'ESNext'");

  const resolver = createResolver(config.dirs.cwd, config.compile, config.resolve);
  const transpiler: Transpiler = async (filename: string) => {
    const source = (await afs.readFile(filename)).toString("utf8");
    const transpileOpts: TranspileOptions = {
      fileName: path.basename(filename),
      compilerOptions: config.compile,
      transformers: {
        after: [
          ...config.transformers,
          createImportsTransformer(config.dirs, resolver, filename, config.preloadList),
        ],
      },
    };
    const result = transpileModule(source, transpileOpts);
    return result?.outputText;
  };

  config.transpiler ||= transpiler;
  return config;
}

export async function transpile(url: URL, config: TsTranspileOptions) {

  const { pathname, searchParams } = url;
  let source = "";

  try {

    const sourceProvider = async (filename: string) => {
      let source2: string;
      let cachedValue = config.cache.get(filename);
      const stats = config.cache.reloadSupported ? await afs.stat(filename) : { mtimeMs: 0 };
      if (!cachedValue || cachedValue.mtimeMs < stats.mtimeMs) {
        source2 = await config.transpiler(filename);
        cachedValue = { mtimeMs: stats.mtimeMs, source: source2 };
        config.cache.set(filename, cachedValue);
      } else {
        source2 = cachedValue.source;
      }
      return source2;
    };

    const ext = path.extname(pathname);
    const importContextQuery = searchParams.get(contextParam) || "";
    config.preloadList.length = 0;

    // transpile typescript
    if (importContextQuery && config.resolve.extensions.includes(ext)) {
      const ctx = ctxVerify(importContextQuery);
      info(`tsTranspile moduleImport/extension match: ${pathname}`);
      source = await sourceProvider(`${ctx}${pathname}`);
    } else if ([".ts", ".tsx"].includes(ext)) {
      info(`tsTranspile direct ts/tsx: ${pathname}`);
      const filename = path.join(config.dirs.cwd, config.dirs.baseFolder, pathname.substr(config.dirs.mountPoint.length));
      source = await sourceProvider(filename);
    }

    /*
    const preload = config.preloadList.reduce(
      (r, i) => `${r}document.write("<link rel='module-preload' href='${i}'/>");\n`, "");
    const preload = config.preloadList.reduce((r, i) => `${r}loadScript("${i}");\n`, "");
    source = preload + source;
    */
  } catch (e) {
    error(`tsTranspile error ${pathname}:`, e);
    throw new Error(e);
  }

  return source;
}
