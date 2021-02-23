import { SwaggerAPI } from "koa-joi-router-docs";
import joiRouter from "koa-joi-router";

let spec: unknown;

function generateSpec(router: joiRouter.Router, basePath: string) {
  const specInfo /*: koaJoiRouterDocs.SpecConfig */ = {
    info: {
      title: `${process.env.APP_NAME} API`,
      description: "API",
      version: "1.0",
    },
    basePath,
    tags: [{
      name: "API",
      description: "application programetic interface",
    }],
    defaultResponses: {
      200: {
        description: "OK",
      },
      500: {
        description: "ERROR",
      },
    },
  };

  const generator = new SwaggerAPI();
  generator.addJoiRouter(router);
  return generator.generateSpec(specInfo);
}


// add swagger docs and api on this rounter
export function init(router: joiRouter.Router) {

  const basePath = "/";//router.router?.opts?.prefix || "/";
  const redoc = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>OpenAPI Specification</title>
</head>
<body>
  <redoc spec-url='/_openapi.json' lazy-rendering></redoc>
  <script src="https://rebilly.github.io/ReDoc/releases/latest/redoc.min.js"></script>
</body>
</html>
`;

  router.get("/_openapi", {
    meta: {
      swagger: {
        summary: "OpenApi Specification",
        description: "Portal",
        tags: ["swagger"],
      },
    },
  }, ctx => {
    ctx.body = redoc;
    ctx.status = 200;
    ctx.type = "html";
  });

  router.get("/_openapi.json", {
    meta: {
      swagger: {
        summary: "OpenApi Specification",
        description: "data in JSON format",
        tags: ["swagger"],
      },
    },
  }, ctx => {

    // we initialize the spec on first call, after the router is fully built
    if (!spec) spec = generateSpec(router, basePath);
    ctx.body = JSON.stringify(spec, undefined, "  ");
    ctx.status = 200;
    ctx.type = "json";
  });

  return router;
}
