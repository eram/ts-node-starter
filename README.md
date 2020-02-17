# ts-node template
this is a Typescript starter project:
- typescript integrated into debugging and running (js files are not created)
- async everywhere: main is the application start point
- environment loaded from pm2 to process.env
- vscode integration: debug code and tests with F5 etc
- app server intergated - KoaJS
   - router with parameter validations - Joi based
   - static site served from ```public/``` folder (/)
   - healthcheck api (/_healthcheck)
   - sample api (/getcpu/1)
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
- pm2.json - pm2 conf / per environment env vars
- jest.config.js - jest conf
- .eslintrc.json - eslint conf
- tsconfig - typescript conf
- package.json - node project
- dockerfile - docker build

## todo
- pm2
  - launch and watchdog
  - log aggregation - logstash
  - counters to new-relic

