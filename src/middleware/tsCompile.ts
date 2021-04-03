/* eslint-disable @typescript-eslint/naming-convention */
//
// this code is based oncode from npm express-typescript-compile
// https://github.com/majo44/express-typescript-compile
//
import {
  CompilerOptions,
  // findConfigFile,
  // formatDiagnostics,
  ModuleKind,
  // parseJsonConfigFileContent,
  // readConfigFile,
  ScriptTarget,
  // sys,
  CustomTransformerFactory,
  SourceFile,
  TransformerFactory,
  transpileModule,
} from "typescript";
import * as path from "path";
import type { ResolveOptions as ResolverResolveOptions } from "enhanced-resolve";
import { afs } from "../utils";

// import type {} from "typescript";

export type Transformers = Array<TransformerFactory<SourceFile> | CustomTransformerFactory>;

/**
 * Compiler options.
 * @public
 * /
export interface CompileOptions {
  /**
   * Path to tsconfig.json file, default is tsconfig.json in working dir.
   * /
  tsConfigFile?: string,
  /**
   * Overwrites for the tsconfig.json compilerOptions options.
   * For more info please look at {@link https://www.typescriptlang.org/tsconfig | TSConfig Reference}.
   * /
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compilerOptions?: any;
  /**
   * Custom additional source files transformers.
   * /
  transformers?: Array<TransformerFactory<SourceFile> | CustomTransformerFactory>
}
*/
/**
 * Options for node resolver.
 * For more info please go to {@link https://www.npmjs.com/package/enhanced-resolve | enhanced-resolve }
 * documentation.
 * @public
 */
export interface ResolveOptions extends Partial<ResolverResolveOptions> {
  /**
   * A list of module alias configurations or an object which maps key to value.
   */
  alias?:
  | { [index: string]: string | false | string[] }
  | {
    alias: string | false | string[];
    name: string;
    onlyModule?: boolean;
  }[];
  /**
   * A list of extensions which should be tried for files.
   * Default `['.ts', '.tsx', '.js', '.cjs', '.mjs']`.
   */
  extensions?: string[];
  /**
   * A list of main fields in description files.
   * Default `['browser', 'module', 'import', 'jsnext:main', 'main']`
   */
  mainFields?: (
    | string
    | string[]
    | { name: string | string[]; forceRelative: boolean }
  )[];
  /**
   * A list of exports field condition names.
   * Default: `['browser', 'module', 'import', 'node', 'default']`,
   */
  conditionNames?: string[];
}

/**
 * Value stored in cache.
 * @public
 */
export interface CachedValue {
  /**
   * Last update timestamp.
   */
  timestamp: number;
  /**
   * Transpiled code.
   */
  source: string;
}

/**
 * Caching options.
 * @public
 */
export interface CacheOptions {
  /**
   * Set value to cache.
   */
  set: (key: string, value: CachedValue) => void;
  /**
   * Get value trom cache.
   */
  get: (key: string) => CachedValue | undefined;
}

/**
 * Middleware configuration options.
 * @public
 */
export interface TsCompileOptions {
  /**
   * Options for compiler.
   */
  // compile?: CompileOptions;
  compile?: CompilerOptions;
  /**
  * Options for the dependencies resolver.
  */
  resolve?: ResolveOptions;
  /**
   * Options for cache.
   */
  cache?: CacheOptions;

  /**
   * Working dir.
   * @internal
   */
  // cwd?: string;

  transformers?: Transformers;

  preloadList?: Array<string>;
}

/**
 * Default compiler options.
 * @internal
 */
const defaultCompilerOptions: CompilerOptions = {
  module: ModuleKind.ESNext,
  target: ScriptTarget.ES2016,
  sourceMap: false,
};

type Resolver = {};   // TODO: import Resolver from "enhanced-resolve"
type Transpiler = (file: string) => Promise<string>;

function createTranspiler(compilerOptions: CompilerOptions,
  _transformers: Transformers,
  _resolve: Resolver,
  _preloadList: Array<string>,
): Transpiler {
  return async (file) => {
    const source = (await afs.readFile(file)).toString("utf8");
    const result = transpileModule(source, {
      fileName: path.basename(file),
      compilerOptions,
      /* transformers: {
        after: [
          ...transformers,
          // createImportsTransformer(cwd, resolve, file, preloadList)
        ],
      }, */
    });
    return result.outputText;
  };
}


/**
 * Prepare the configuration options.
 * @param opts - user config
 * @internal
 */
export function prepare(opts: TsCompileOptions) {
  const cache: Record<string, CachedValue> = {};
  const config: TsCompileOptions = {
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
      get: (key: string) => Promise.resolve(cache[key]),
      set: (key: string, value: CachedValue) => cache[key] = value, // eslint-disable-line
      ...opts.cache,
    },
    // logLevel: config.logLevel || LogLevel.warn,
    // cwd: config.cwd || process.cwd(),
    transformers: [].concat(opts.transformers),
    preloadList: [].concat(opts.preloadList),
  };

  const resolver: Resolver = { resolve: config.resolve }; // TODO: createResolver(cwd, compilerOptions, resolve, log);
  const transpiler = createTranspiler(config.compile, config.transformers, resolver, config.preloadList);

  return Object.assign(config, { transpiler });
}


/**
 * Prepare typescript compiler options.
 * @internal
 * @param cwd - running dir
 * @param options - custom compiler options
 * @param logger - logger
 * /
export const createCompilerOptions = (
  cwd: string,
  options: CompileOptions = {},
  logger: Logger = console): CompilerOptions => {

  let { tsConfigFile } = options;
  let configJson: any = {
    compilerOptions: options.compilerOptions,
  };

  // if not provided we will lookup for existing default
  if (!tsConfigFile) {
    tsConfigFile = findConfigFile(cwd, sys.fileExists);
  }
  // if no config throe message
  if (!tsConfigFile) {
    logger.warn("tsconfig.json not found ! "
      + "The default minimal config will be used. "
      + "You can provide tsconfig.json in working dir, "
      + "or set custom path in options, like: typescriptCompileMiddleware({
        compile: { tsConfigFile: './path/to/custom-tsconfig.json'} })");
  } else {
    logger.debug(`tsconfig.json found: ${tsConfigFile}`);
    // reading config file
    const configFile = readConfigFile(tsConfigFile, sys.readFile);
    if (!configFile.error) {
      configJson = {
        ...configFile.config,
        compilerOptions: {
          ...configFile.config.compilerOptions,
          ...options.compilerOptions,
        },
      };
    } else {
      throw new Error(
        `tsconfig.json parse error !\n${diagnosticToString([configFile.error], cwd)}`);
    }
  }

  // parse config file
  const parsedConfig = parseJsonConfigFileContent(configJson, {
    fileExists: sys.fileExists,
    readDirectory: sys.readDirectory,
    readFile: sys.readFile,
    useCaseSensitiveFileNames: false,
  }, cwd, undefined, tsConfigFile);

  const { module } = parsedConfig.options;

  // warn about improper module
  if (module === ModuleKind.CommonJS
    || module === ModuleKind.AMD
    || module === ModuleKind.System
    || module === ModuleKind.None
    || module === ModuleKind.UMD) {
    logger.warn("typescript compilerOptions 'module' option is not "
      + " ES module, this will probably cause the problem with the script loading to the browser,"
      + " please use ES2015, ES2020, or ESNext");
  }

  return {
    ...defaultCompilerOptions,
    ...parsedConfig.options,
  };
};
*/
