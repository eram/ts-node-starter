//
// this code is based on code from npm express-typescript-compile
// https://github.com/majo44/express-typescript-compile
//
/* eslint-disable @typescript-eslint/naming-convention */
import { CachedInputFileSystem, ResolverFactory } from "enhanced-resolve";
import type { ResolveOptions as ResolverResolveOptions } from "enhanced-resolve";
import fs from "fs";
import * as path from "path";
import { CompilerOptions, createCompilerHost, Extension, nodeModuleNameResolver } from "typescript";
import { debug, error, info } from "../../utils";

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
 * Result of dependencies resolution.
 * @internal
 */
export interface Resolution {
  /**
   * path of cause module
   */
  context: string;
  /**
   * required dependency
   */
  target: string;
  /**
   * path to resolved module
   */
  resolution: string;
  /**
   * it is a absolute url
   */
  isUrl?: boolean;
  /**
   * is resolved by the typescript
   */
  isTypescript?: boolean;
  /**
   * is resolved by the node resolver
   */
  isNode?: boolean;
}

/**
 * Base resolver type.
 */
export type Resolver = (context: string, target: string) => Resolution;

/**
 * Create the dependencies resolver;
 * @internal
 * @param cwd - working dir
 * @param compilerOptions - compiler options
 * @param options - resolver options
 * @param logger - logger
 */
export function createResolver(
  cwd: string,
  compilerOptions: CompilerOptions,
  options: Partial<ResolveOptions>): Resolver {

  info("create resolver with options:", options);

  /**
   * Prepare compiler host.
   */
  const compilerHost = createCompilerHost(compilerOptions);


  /**
   * Prepare base resolver
   */
  const resolver = ResolverFactory.createResolver({
    cacheWithContext: false,
    fileSystem: new CachedInputFileSystem(fs, 4000),
    useSyncFileSystemCalls: true,
    ...options,
  });

  /*
   * Is checking alias is a absolute url.
   * @param target - target dependency
   */
  const checkAliasForUrl = (target: string): string | undefined => {
    let resolution: string | undefined;
    if (Array.isArray(options.alias)) {
      const alias = options.alias.find(i => i.name === target);
      if (alias && typeof alias.alias === "string") {
        resolution = alias.alias;
      }
    } else {
      const alias = options.alias?.[target];
      if (alias && typeof alias === "string") {
        resolution = alias;
      }
    }
    if (resolution && (resolution.startsWith("http://") || resolution.startsWith("https://"))) {
      return resolution;
    }
    return undefined;
  };

  return (context: string, target: string): Resolution => {
    const prefix = `resolve '${target}' @ '${path.basename(context)} >>`;

    // is a absolute url
    const urlAlias = checkAliasForUrl(target);
    if (urlAlias) {
      debug(`${prefix} alias '${urlAlias}'`);
      return { context, target, resolution: urlAlias, isUrl: true };
    }

    // is from ts/tsx module
    if (context.endsWith(".ts") || context.endsWith(".tsx")) {
      // try resolving by the typescript
      const tsResolution = nodeModuleNameResolver(target, context, compilerOptions, compilerHost);
      if (tsResolution?.resolvedModule?.resolvedFileName
        && tsResolution.resolvedModule.extension !== Extension.Dts) {
        debug(`${prefix} typescript '${tsResolution.resolvedModule.resolvedFileName}'`);
        return {
          isTypescript: true,
          context, target, resolution: tsResolution.resolvedModule.resolvedFileName,
        };
      }
    }

    try {
      // try resolving by the node
      const nodeResolution = resolver.resolveSync({}, path.dirname(context), target);
      if (nodeResolution) {
        debug(`${prefix} enhanced-resolver '${nodeResolution}'`);
        return {
          isNode: true,
          context, target, resolution: nodeResolution,
        };
      }

    } catch (e) {
      error(e);
    }

    error(`${prefix} not resolved !!!`);
    throw new Error(`tsCompile resolution not found: '${target}' @ '${context}'`);
  };
}
