BBGO Karma Bot - BBG token distribution automation

# Requirement

- node 16
- yarn
- pm2
- mongodb

## Setup

Note that while setting a secret is optional on GitHub, it is required to be set in order to use `@octokit/webhooks`. Content Type must be set to `application/json`, `application/x-www-form-urlencoded` is not supported.


### dotenv

```
GITHUB_WEBHOOK_SECRET=__secret__
GITHUB_PERSONAL_TOKEN=__personal_token__

GITHUB_OAUTH_CLIENT_ID=__oauth_client_id__
GITHUB_OAUTH_SECRET=__oauth_secret__

CONTRACT_ADDRESS=__contract_address__
CONTRACT_OWNER_ADDRESS=__owner_address__

PRIVATE_KEY=__contract_private_key__
MONGO_URL=mongodb://localhost:27017

DEPLOY_HOST=bbgo
DEPLOY_USER=root
DEPLOY_HOME=/home/karma

# DEV_PROXY=https://smee.io/sTg2t0azYc123123123123%
```

### Local Testing

You can receive webhooks on your local machine or even browser using [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) and [smee.io](https://smee.io/).

Go to [smee.io](https://smee.io/) and <kbd>Start a new channel</kbd>. Then copy the "Webhook Proxy URL" and

1. enter it in the GitHub App’s "Webhook URL" input
2. set it to the DEV_PROXY environment variable



## Deploy

```shell
npx shipit production deploy
```

# Reference

- How To Automate Your Node.js Production Deployments with Shipit on CentOS 7 <https://www.digitalocean.com/community/tutorials/how-to-automate-your-node-js-production-deployments-with-shipit-on-centos-7>
- Deploying a NodeJS Application Using GitHub Actions <https://medium.com/@g.c.dassanayake/deploying-a-nodejs-application-using-github-actions-e5f4bde7b21b>
- Ethereum JavaScript Libraries: web3.js vs. ethers.js (Part II) <https://blog.infura.io/ethereum-javascript-libraries-web3-js-vs-ethers-js-part-ii>
- Using the Ethereum Web3 Library to Send Transactions on Moonbeam <https://medium.com/moonbeam-network/using-the-ethereum-web3-library-to-send-transactions-in-moonbeam-5b8593767904>
- GitHub OAuth Login with Node.js <http://thecodebarbarian.com/github-oauth-login-with-node-js.html>
- octokit/rest.js <https://octokit.github.io/rest.js/v18>
- octokit/webhooks <https://github.com/octokit/webhooks.js/#local-development>
- smee.io <https://smee.io/>

