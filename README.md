# ts-node-starter
This is a Typescript starter project meant to get you up and running with a NodeJS API or a micro-service project. The setup includes an HTTP server, REST APIs, a database, authentication, cluster support, and more. This setup is optimized for use in a container/k8s environment - dockerfile and YAMLs included. 

## features:
- NodeJS v14+ / ES2020 environment 
- Typescript v4+ integrated into debugging and running. JS files are never created! [ts-node]
- VSCode integration: debug code and tests with F5 etc.
- Docker and Kubernetes config files: service, deployment, cron-job, config-maps and secrets. Files include tokens to be replaced by your CI server when you deploy.
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
  - Multiple app workers management (aka threads/forks).
  - Watchdog checking workers' responsiveness and CPU/mem consumption.
  - Watchdog checking the cluster's master - can restart the whole cluster if needed.
  - Inter-worker messaging (no need for pm2/io).
  - Workers' console piped to cluster
  - Dynamic plugins loading
- APM library: counters, meters, and histograms (no need for pm2/io).
- Logger hooking into the console producing raw or json output (no need for pino or winston).
- Utilities: trie for large structures cross-worker data passing; state-machine etc.
- Unit tests with full coverage [jest].
- Linter: opinionated code styling enforcement [eslint/typescript].
- Code quality enforcement included in linter [sonar]

## setup
Opt A: use the companion ```create-ts-node-starter``` repo:
1. install nodejs and git
1. ```> npm init ts-node-starter <project-name> [vscode]```

Opt B: 
1. install nodejs and git
1. ```> git clone <this repo> <new folder>```
1. ```> cd <new folder>```
1. ```> npm install```
1. ```> npm run createDb```
1. ```> npm run start:dev```
1. ```> code .```

## config files
config files under root folder:
- .env - default environment vars for dev
- package.json - node project
- tsconfig.json - typescript conf
- cluster.config.js - conf for cluster configuration
- jest.config.js - jest conf
- .eslintrc.json - eslint conf
- dockerfile - docker build
- k8s folder with Kubernetes yaml files
- .vscode folder - VSCode launch settings

## folder structure
```
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
  +-- k8s               yamls for Kubernetes
```

## FAQ
Q: What if I like to use single-quotes for strings?

A: Change ```"quotes"``` line in ```.eslintrc.json``` file from ```"double"``` to ```"single"``` and then ```> npm run lint```

Q: How do I get the logs reported to ELK?

A: On different cloud platfroms stdout is automatically redirected to a central log server (e.g. Application Insights in AKS). If you're using your own ELK or external logging service, you probably want to setup [a Node-level logging agent, like Fluentd, to run as a DeamonSet](https://medium.com/kubernetes-tutorials/cluster-level-logging-in-kubernetes-with-fluentd-e59aa2b6093a).

## further reading
- [NodeJS performance-killers](https://itnext.io/my-list-of-typical-performance-killers-of-nodejs-web-applications-60349b898234)
- [Implementing 12-factor apps with Kubernetes](https://medium.com/ibm-cloud/kubernetes-12-factor-apps-555a9a308caf)

