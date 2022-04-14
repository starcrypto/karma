require('dotenv').config()
console.log(process.env)

const parseDiff = require('parse-diff');

const { Webhooks, createNodeMiddleware } = require("@octokit/webhooks");
const webhooks = new Webhooks({
  secret: process.env.GITHUB_WEBHOOK_SECRET
});

webhooks.onAny(({ id, name, payload }) => {
    console.log(name, "event received");
});

webhooks.on("pull_request.opened", (payload) => {
    console.log("pull_request.opened", payload);
    let userLogin = payload.pull_request.user.login;
    let diffUrl = payload.pull_request.diff_url;
    let pullRequestNo = payload.number;
    let state = payload.pull_request.state;

    let diff = ''; // input diff string
    let files = parseDiff(diff);
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
