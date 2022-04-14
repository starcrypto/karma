require('dotenv').config()

const fs = require('fs');
const path = require("path");

const deployHost = process.env.DEPLOY_HOST
const deployUser = process.env.DEPLOY_USER
const deployHome = process.env.DEPLOY_HOME


module.exports = shipit => {
    require('shipit-deploy')(shipit);
    require('shipit-shared')(shipit);

    const appName = 'karma';


    shipit.initConfig({
        default: {
            deployTo: deployHome,
            repositoryUrl: 'https://github.com/starcrypto/karma.git',
            branch: 'main',
            keepReleases: 5,
            shared: {
                overwrite: true,
                dirs: ['node_modules']
            }
        },
        production: {
            servers: `${deployUser}@${deployHost}`
        }
    });

    const path = require('path');
    const ecosystemFilePath = path.join(
        shipit.config.deployTo,
        'shared',
        'ecosystem.config.js'
    );

    const dotenvFilePath = path.join(
        shipit.config.deployTo,
        'shared',
        '.env'
    );

    shipit.on('updated', async () => {
        shipit.start('yarn-install', 'copy-config');
    });

    shipit.on('published', async () => {
        shipit.start('pm2-server');
    });

    shipit.blTask('copy-config', async () => {
        const ecosystem = `
module.exports = {
apps: [
  {
    name: '${appName}',
    script: '${shipit.releasePath}/main.js',
    watch: true,
    autorestart: true,
    restart_delay: 1000,
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }
]
};`;

        fs.writeFileSync('ecosystem.config.js', ecosystem, function(err) {
            if (err) throw err;
            console.log('File created successfully.');
        });

        await shipit.copyToRemote('ecosystem.config.js', ecosystemFilePath);
        await shipit.copyToRemote('.env.prod', dotenvFilePath);
        await shipit.remote(`ln -s ${dotenvFilePath} ${shipit.releasePath}/.env`)
    });

    shipit.blTask('yarn-install', async () => {
        shipit.remote(`cd ${shipit.releasePath} && yarn install --production`);
    });

    shipit.blTask('pm2-server', async () => {
        await shipit.remote(`pm2 delete -s ${appName} || :`);
        await shipit.remote(
            `pm2 start ${ecosystemFilePath} --env production --watch true`
        );
    });


    // Our listeners and tasks will go here
};

