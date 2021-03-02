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
  - Key-value store
  - User base
- User authentication: SSO with github oAuth.
- Cluster support built-in (no need for pm2 or nodemon).
  - Multiple apps' workers management (aka threads/forks).
  - Watchdog checking workers' responsivness and CPU/mem consumtion.
  - Inter-worker messaging (no need for pm2/io).
  - Workers' console piped to cluster
  - Dynamic plugins support
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
- cluster.config.js - conf for cluster configuration
- jest.config.js - jest conf
- .eslintrc.json - eslint conf
- dockerfile - docker build
- k8s folder with Kubernetese yaml files
- .vscode folder - VSCode launch settings

## folder structure
```
+
+-- <project root>      project config files
  +-- src               commandline parser
    +-- controllers     API endpoints
    +-- jobs            application entry points
      +-- app           main application
      +-- exampleJob    example cron job
    +-- libs            libraries
      +-- cluster       cluster manager and comms
      +-- trie          large structures cross-worker data passing
    +-- middleware      app server middleware
    +-- models          database repos
    +-- types           typescript typings
    +-- utils           std lib
  +-- public            static site
  +-- scripts           setup / teardown and load-testers
  +-- k8s               yamls for Kubernetese
```

## further reading
- [NodeJS performance-killers](https://itnext.io/my-list-of-typical-performance-killers-of-nodejs-web-applications-60349b898234)
- [Implementing 12-factor apps with Kubernetese](https://medium.com/ibm-cloud/kubernetes-12-factor-apps-555a9a308caf)
- 