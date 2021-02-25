# ts-node-starter template
This is a Typescript starter project:
- NodeJS v14+ / ES2020 environment 
- Typescript v4+ integrated into debugging and running. JS files are never created! [ts-node]
- VSCode integration: debug code and tests with F5 etc.
- Docker and Kubernetese config files:  service, deployment, job, config-maps and secrets.
- Environment variables loaded from .env file [dotEnv].
- Command-line option parser [commander].
- App server intergated [koa].
  - Router with parameter validations [joi-router].
  - Static site served from ```public/``` folder.
  - Healthcheck api (```/_healthcheck```).
  - Automatic Swagger API and portal (```/_openapi.json```) and docs (```/_opendapi```).
  - Authorization with JWT and cookies (latest security standards!).
  - Http logger, cors, gzip, error handler, user-agent parser etc.
- ORM/Repos [Sequalize / SQLite as default].
- User authentication: SSO with github oAuth.
- Cluster support built-in (no need for pm2 or nodemon).
  - Multiple apps' workers management (aka threads/forks).
  - Watchdog checking workers' responsivness and CPU/mem consumtion.
  - Inter-worker messaging (no need for pm2/io).
  - Workers' console piped to cluster
- APM library: counters, meters and histograms (no need for pm2/io).
- Logger hooking into console with raw/json output.
- Utilities: trie for large structures cross-worker data passing; state-machine etc.
- Unit tests with full converage [jest].
- Linter: opinionated code styling enforcement [eslint/typescript].
- Code quality enforcement included in linter [sonar]

## setup
1. install nodejs and git
1. ```> git clone ...```
1. ```> npm install```
1. ```> node run createDb```
1. ```> npm start:dev```

## config files
config files under root folder:
- .env - default environment vars for dev
- package.json - node project
- tsconfig.json - typescript conf
- cluster.config.js - pm2 conf for cluster configuration
- jest.config.js - jest conf
- .eslintrc.json - eslint conf
- dockerfile - docker build
- k8s folder with Kubernetese yaml files

## reading
- [NodeJS performance-killers](https://itnext.io/my-list-of-typical-performance-killers-of-nodejs-web-applications-60349b898234)
- 