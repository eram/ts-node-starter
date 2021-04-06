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
import { Resolver } from "./resolver";

export const importContextQueryParam = "__mi_ctx";

/**
 * Create source code transformer
 * @internal
 * @param cwd - working dir
 * @param resolve - dependencies resolver
 * @param file - target file
 * @param preloadList - list modules to preload
 */
export function createImportsTransformer(
  cwd: string,
  resolve: Resolver,
  file: string,
  preloadList: Array<string>): TransformerFactory<SourceFile> {

  /**
   * Creates import url.
   * @param target - for the dependency
   */
  const getUrl = (target: string): string => {
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
      url = `/${resolved}?${context ? `&${importContextQueryParam}=${context}` : ""}`;
    }
    if (preloadList.indexOf(url) < 0) {
      preloadList.push(url);
    }
    return url;
  };

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
