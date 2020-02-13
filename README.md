# ts-node template
this is a Typescript starter project:
- typescript integrated into debugging and running (js files are not created)
- async everywhere: main is the application start point
- environment loaded from pm2 to process.env
- vscode integration: debug code and tests with F5 etc
- app server intergated - KoaJS
   - router with parameter validations - Joi based
   - static site served from ```public/``` folder
   - healthcheck api
   - sample api (/getCpu/1)
- db orm/repo
- counters with pm2/io
- logger using console
- unit tests and converage - jest
- code styling enforcement - eslint

## setup
1. install nodejs and git
1. ```> git clone ...```
1. ```> npm install```
1. ```> npm start```

## config
config files under root folder:
- env.defaults.json - default environment vars
- pm2 conf
- jest conf
- eslint conf
- tsconfig - typescript conf
- Dockerfile

## todo
- pm2
  - launch and watchdog
  - log aggregation - logstash
  - counters - pmx and new-relic
- docker
