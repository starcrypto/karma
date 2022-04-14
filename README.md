

# Requirement

- node 16
- yarn
- pm2
- mongodb

## Setup

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

## Deploy

```shell
npx shipit production deploy
```
