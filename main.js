require('dotenv').config()

const fetch = require('node-fetch');

const parseDiff = require('parse-diff');

const {Octokit} = require("@octokit/rest");

const {Webhooks, createNodeMiddleware} = require("@octokit/webhooks");

const octokit = new Octokit({
    auth: process.env.GITHUB_PERSONAL_TOKEN,
});

const webhooks = new Webhooks({
    secret: process.env.GITHUB_WEBHOOK_SECRET
});

const polygonAddressRE = /polygon:(0x[a-fA-F0-9]{40}$)/;

webhooks.onAny(({id, name, payload}) => {
    console.log(name, "event received");
});

webhooks.on([
    "issue_comment.created",
    "issue_comment.edited",
], ({id, name, payload}) => {

    const issueNumber = payload.number;
    const issueOwner = payload.issue.user.login;
    const commentOwner = payload.comment.user.login;
    if (issueOwner != commentOwner) {
        return
    }

    // check the address format
    const matched = polygonAddressRE.exec(payload.comment.body)
    if (matched) {
        const address = matched[1];
        console.log("matched address", address);


    } else {
        const comment = `Hi @${issueOwner},
    
You left an invalid address format, please write your address with the following format:
 
        polygon:0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B
      
`
        const resp = octokit.rest.issues.createComment({
            owner: payload.repository.owner.login,
            repo: payload.repository.name,
            issue_number: issueNumber,
            body: comment,
        });
        console.log(resp);

    }
})

webhooks.on([
    "pull_request.opened"
], ({id, name, payload}) => {
    const issueNumber = payload.number;

    const userLogin = payload.pull_request.user.login;
    const baseOwner = payload.repository.owner.login;
    const baseRepo = payload.repository.name;

    const comment = `Hi @${userLogin},
    
To receive BBG token, please left your polygon address as an issue comment in this pull request with the following format, e.g.,
 
        polygon:0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B
      
Once this pull request is merged, your BBG token will be sent to your wallet.
`

    const resp = octokit.rest.issues.createComment({
        owner: baseOwner,
        repo: baseRepo,
        issue_number: issueNumber,
        body: comment,
    });
    console.log(resp);
})

webhooks.on([
    "pull_request.opened",
    "pull_request.reopened",
    "pull_request.synchronize",
    "pull_request.closed"
], async ({id, name, payload}) => {
    console.log(name, id, payload);

    const userLogin = payload.pull_request.user.login;
    const diffUrl = payload.pull_request.diff_url;
    const issueNumber = payload.number;
    const state = payload.pull_request.state;

    const response = await fetch(diffUrl);
    const diffText = await response.text();
    const files = parseDiff(diffText);
    console.log(files);


});


// proxy
const EventSource = require('eventsource')
const webhookProxyUrl = "https://smee.io/sTg2t0azYcNNu5H1"; // replace with your own Webhook Proxy URL
const source = new EventSource(webhookProxyUrl);
source.onmessage = (event) => {
    const webhookEvent = JSON.parse(event.data);
    webhooks
        .verifyAndReceive({
            id: webhookEvent["x-request-id"],
            name: webhookEvent["x-github-event"],
            signature: webhookEvent["x-hub-signature"],
            payload: webhookEvent.body,
        })
        .catch(console.error);
};

require("http").createServer(createNodeMiddleware(webhooks)).listen(3301);
