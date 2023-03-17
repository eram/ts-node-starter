//
// this code is based on code from npm express-typescript-compile
// https://github.com/majo44/express-typescript-compile
//
import {
  isCallExpression,
  isExportDeclaration,
  isImportDeclaration,
  isStringLiteral,
  Node, SourceFile, SyntaxKind,
  TransformationContext, TransformerFactory,
  visitEachChild,
} from "typescript";

import * as path from "path";
import * as jsonwebtoken from "jsonwebtoken";
import { Resolver } from "./resolver";
import { warn } from "../../utils";

export const contextParam = "__mi_ctx";
const tokenKey = `${contextParam}9876`;
const expiresIn = "1d";

export const ctxSign = (ctx: string) => jsonwebtoken.sign(ctx, tokenKey, { expiresIn });

export const ctxVerify = (enc: string) => {
  let ctx = "";
  try {
    ctx = String(jsonwebtoken.verify(enc, tokenKey));
  } catch (e) {
    // log the err and return the empty string. this would result with a 404
    warn("[importsTransformer] invalid context from client:", enc);
  }
  return ctx;
};

/**
 * Create source code transformer
 * @internal
 * @param cwd - working dir
 * @param resolve - dependencies resolver
 * @param file - target file
 * @param preloadList - list modules to preload
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export function createImportsTransformer(
  dirs: { baseFolder: string; mountPoint: string; cwd?: string; },
  resolve: Resolver,
  file: string,
  preloadList: Array<string>): TransformerFactory<SourceFile> {

  const { cwd } = dirs;
  let { baseFolder, mountPoint } = dirs;
  baseFolder = baseFolder.startsWith("./") ? baseFolder.substr(2) : baseFolder;
  baseFolder = baseFolder.startsWith("/") ? baseFolder.substr(1) : baseFolder;
  mountPoint = mountPoint.startsWith("./") ? mountPoint.substr(2) : mountPoint;
  mountPoint = mountPoint.startsWith("/") ? mountPoint.substr(1) : mountPoint;

  function getUrl(target: string): string {
    let url: string;
    const resolution = resolve(file, target);
    if (resolution.isUrl) {
      url = resolution.resolution;
    } else {
      let resolved = path.relative(cwd, resolution.resolution);
      resolved = resolved.replace(/\\/g, "/");
      let context = "";
      while (resolved.startsWith("../")) {
        context += "../";
        resolved = resolved.substr(3);
      }
      if (resolved.startsWith(baseFolder)) {
        resolved = mountPoint + resolved.substr(baseFolder.length);
      }

      // the context is added to the link that the client gets so it must be signed to
      // prevent the client from changing it and gaining access to any location.
      const token = context ? `?${contextParam}=${ctxSign(context)}` : "";
      url = `/${resolved}${token}`;
    }
    if (preloadList.indexOf(url) < 0) {
      preloadList.push(url);
    }
    return url;
  }

  return (context: TransformationContext) => {
    // creates visitor
    const visitor = <T extends Node>(node: T): T => {
      // dynamic import call
      if (isCallExpression(node) && node.expression.kind === SyntaxKind.ImportKeyword) {
        const arg = node.arguments[0];
        if (isStringLiteral(arg)) {
          return context.factory.updateCallExpression(
            node, node.expression, node.typeArguments, [
              context.factory.createStringLiteral(getUrl(arg.text))]) as typeof node;
        }
        // todo report problematic import
      }

      // export ... from ...
      if (isExportDeclaration(node) && !node.isTypeOnly) {
        const moduleSpecifier = node.moduleSpecifier;
        if (moduleSpecifier && isStringLiteral(moduleSpecifier)) {
          return context.factory.updateExportDeclaration(
            node, node.decorators, node.modifiers, node.isTypeOnly, node.exportClause,
            context.factory.createStringLiteral(getUrl(moduleSpecifier.text))) as typeof node;
        }
      }

      // import ... from ...
      if (isImportDeclaration(node) && !node.importClause?.isTypeOnly) {
        const moduleSpecifier = node.moduleSpecifier;
        if (isStringLiteral(moduleSpecifier)) {
          return context.factory.updateImportDeclaration(
            node, node.decorators, node.modifiers, node.importClause,
            context.factory.createStringLiteral(getUrl(moduleSpecifier.text))) as typeof node;
        }
        return node;
      }

      return visitEachChild(node, visitor, context);
    };

    return <T extends Node>(node: T) => visitEachChild(node, visitor, context);
  };
}

