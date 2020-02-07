module.exports = {
  apps : [{
    name: 'ts-node-starter',
    script: 'src/index.js',

    // Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
    // args: 'one two',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',

    env: {
      DOTENV_CONFIG_PATH: './config/.development.env'
    },
    env_test: {
      DOTENV_CONFIG_PATH: './config/.test.env',
      CORALOGIX_APIKEY: "98d36d56-a8ff-75a6-1fd2-389a76edf768",
      NEWRELIC_APIKEY: "4ce0c3d5197802cf3d5f9368bcbd62940a2a37267329a37",
    },
    env_cicd: {
      DOTENV_CONFIG_PATH: './config/.cicd.env',
      CORALOGIX_APIKEY: "98d36d56-a8ff-75a6-1fd2-389a76edf768",
      NEWRELIC_APIKEY: "4ce0c3d5197802cf3d5f9368bcbd62940a2a37267329a37",
    },
    env_production: {
      NODE_ENV: 'production',
      CORALOGIX_APIKEY: "98d36d56-a8ff-75a6-1fd2-389a76edf768",
      NEWRELIC_APIKEY: "4ce0c3d5197802cf3d5f9368bcbd62940a2a37267329a37",
      // DOTENV_CONFIG_PATH: './config/.cicd.env'
    }

  }],

  deploy : {
    production : {
      user : 'node',
      host : '212.83.163.1',
      ref  : 'origin/master',
      repo : 'git@github.com:repo.git',
      path : '/var/www/production',
      'post-deploy' : 'npm install && pm2 reload config/ecosystem.config.js --env production'
    }
  }
};
