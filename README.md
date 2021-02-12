# ts-node template
this is a Typescript starter project:
- typescript integrated into debugging and running (js files are not created)
- async everywhere: main is the application start point
- environment loaded from pm2 to process.env
- vscode integration: debug code and tests with F5 etc
- app server intergated - KoaJS
   - router with parameter validations - Joi based
   - static site served from ```public/``` folder (```/```)
   - healthcheck api (```/_healthcheck```)
   - sample api (```/getcpu/1```)
   - swagger api (```/_api.json```) and docs (```/_apiDocs```)
- db orm/repo
- counters with pm2/io
- logger using console
- unit tests and converage - jest
- opinionated code styling enforcement - eslint
- pm2
  - launch and watchdog
  - counters - pmx
- dockerfile

## setup
1. install nodejs and git
1. ```> git clone ...```
1. ```> npm install```
1. ```> npm start```

## config files
config files under root folder:
- env.defaults.json - default environment vars
- pm2.config.js - pm2 conf / per environment env vars
- jest.config.js - jest conf
- .eslintrc.json - eslint conf
- tsconfig.json - typescript conf
- package.json - node project
- dockerfile - docker build

## todo
- pm2
  - launch and watchdog
  - log aggregation - logstash
  - counters to new-relic

## reading
- [Structuring projects and naming components](https://hackernoon.com/structuring-projects-and-naming-components-in-react-1261b6e18d76)
- [NodeJS performance-killers](https://itnext.io/my-list-of-typical-performance-killers-of-nodejs-web-applications-60349b898234)
- 