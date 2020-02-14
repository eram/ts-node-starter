import { SwaggerAPI } from 'koa-joi-router-docs';
import joiRouter from 'koa-joi-router';

const specInfo = {
  info: {
    title: 'ts-node-starter API',
    description: 'API',
    version: '0.0'
  },
  basePath: '/',
  tags: [{
    name: 'healthcheck',
    description: 'application healthcheck'
  }],
  defaultResponses: {
    200: {
      description: 'OK'
    },
    500: {
      description: 'ERROR'
    }
  } // Custom default responses if you don't like default 200
};

const recodBody =
  `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>OpenAPI Specification</title>
</head>
<body>
  <redoc spec-url='/_api.json' lazy-rendering></redoc>
  <script src="https://rebilly.github.io/ReDoc/releases/latest/redoc.min.js"></script>
</body>
</html>
`;


export function appendRoute(router: joiRouter.Router, basePath: string) {

  // setup swagger docs and api
  const generator = new SwaggerAPI();
  generator.addJoiRouter(router);

  router.get('/_apiDocs', ctx => {
    ctx.body = recodBody;
  });

  specInfo.basePath = basePath;
  const spec = generator.generateSpec(specInfo);

  router.get('/_api.json', ctx => {
    ctx.body = JSON.stringify(spec, null, '  ');
  });

  return router;
}