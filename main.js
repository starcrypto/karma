require('dotenv').config()

const Web3 = require('web3');

const fetch = require('node-fetch');

const parseDiff = require('parse-diff');

const {Octokit} = require("@octokit/rest");

const {Webhooks, createNodeMiddleware} = require("@octokit/webhooks");

const {ERC20PresetMinterPauser} = require("./abi/ERC20PresetMinterPauser");

const {MongoClient} = require('mongodb');
const EventSource = require("eventsource");

// const { ethers } = require("ethers");
// const ethersPolygonHttpProvider = new ethers.providers.JsonRpcProvider(polygonRPCUrl);
// const signer = ethersPolygonHttpProvider.getSigner();

const mongoURL = process.env.MONGO_URL
const mongoDbName = "karma";
const mongoClient = new MongoClient(mongoURL);


const db = mongoClient.db(mongoDbName);
const contributors = db.collection('contributor');


const insertContributor = async (login, address) => {
    const insertResult = await contributors.insertOne({
        login: login,
        addresses: {
            polygon: address,
        }
    });
    console.log('inserted contributor', insertResult);
    return insertResult;
}

const findContributor = async (login) => {
    const result = await contributors.find({login}).toArray();
    if (result.length == 0) {
        return null
    }

    return result[0]
};


const polygonRPCUrl = "https://polygon-rpc.com";
const polygonHttpProvider = new Web3.providers.HttpProvider(polygonRPCUrl);

// const web3 = new Web3(polygonProvider Web3.givenProvider);
const web3 = new Web3(polygonHttpProvider);
const ownerAddress = process.env.CONTRACT_OWNER_ADDRESS;
const contractAddress = process.env.CONTRACT_ADDRESS;
const privateKey = process.env.PRIVATE_KEY;
const tokenContract = new web3.eth.Contract(ERC20PresetMinterPauser.abi, contractAddress, {from: ownerAddress});

const signTransaction = async (tokenContract, fromPrivateKey, toAddress, balance) => {
    const encodedTransferABI = tokenContract.methods.transfer(toAddress, balance).encodeABI();

    const estimatedGas = await tokenContract.methods.transfer(toAddress, balance).estimateGas({
        to: contractAddress,
        data: encodedTransferABI,
    });

    const Tx = {
        // We are sending request to WETH contract, asking it to transfer tokens.
        to: contractAddress,
        gas: estimatedGas,
        // We send zero native token, which is Matic on Polygon network.
        value: "0x0",
        // We set only tip for the miner, baseFeePerGas(which is burned) will be set automatically.
        // In order to send legacy transaction(before London fork), you can use gas and gasPrice.
        maxPriorityFeePerGas: await web3.eth.getGasPrice(),
        data: `${encodedTransferABI}`,
    };

    const signTransactionOutput = await web3.eth.accounts.signTransaction(
        Tx,
        fromPrivateKey
    );

    return signTransactionOutput.rawTransaction;
};

const sendTransaction = (rawTransaction, txHashHandler) => {
    return web3.eth.sendSignedTransaction(
        rawTransaction
    ).once('transactionHash', (function (hash) {
        console.log(`tx hash: ${hash}`)
        if (txHashHandler) {
            txHashHandler(hash)
        }
    }))
        .on('confirmation', function (confNumber, receipt) {
            console.log(`confirmation: ${confNumber}`);
        })
        .on('error', async function (error) {
            console.log('something went wrong...', error);
        });
}

const baseKarma = 100;
const lineKarma = 1;
const chunkKarma = 2;

const calculateKarma = (pullRequest, diffs) => {
    let karma = baseKarma;
    karma += chunkKarma * diffs.length
    karma = diffs.reduce((prev, cur) => prev + (lineKarma + Math.abs(cur.additions - cur.deletions)), karma)
    return karma
}

const sendTest = async () => {
    // const totalBalance = await tokenContract.methods.balanceOf(ownerAddress).call();
    // console.log("BBG", totalBalance);

    // for testing (vitalik address)
    const recipientAddress = "0xc1e42f862d202b4a0ed552c1145735ee088f6ccf";
    const amount = web3.utils.toWei('1000');
    const rawTransaction = await signTransaction(tokenContract, privateKey, recipientAddress, amount);
    sendTransaction(rawTransaction, (txHash) => {

    });
};

// sendTest();

/*
const createTransaction = await web3.eth.accounts.signTransaction(
    {
        from: ownerAddress,
        to: recipientAddress,
        value: web3.utils.toWei('100', 'ether'),
        gas: '21000',
    },
    privateKey
);
*/

const octokit = new Octokit({
    auth: process.env.GITHUB_PERSONAL_TOKEN,
});

const webhooks = new Webhooks({
    secret: process.env.GITHUB_WEBHOOK_SECRET
});

const polygonAddressRE = /polygon:(0x[a-fA-F0-9]{40}$)/g;

webhooks.onAny(({id, name, payload}) => {
    console.log(name, "event received");
});

webhooks.on([
    "issue_comment.created",
    "issue_comment.edited",
], ({id, name, payload}) => {

    const issueNumber = payload.issue.number;
    const issueOwner = payload.issue.user.login;
    const commentOwner = payload.comment.user.login;
    if (issueOwner != commentOwner) {
        return
    }

    // ignore issues that is not a pull request
    if (!payload.issue.pull_request) {
        return
    }

    // check the address format
    const matched = polygonAddressRE.exec(payload.comment.body)
    if (matched) {
        const address = matched[1];
        console.log("matched address", address);

        const inserted = insertContributor(issueOwner, address);
        console.log("inserted contributor", inserted)

        const comment = `Great! @${issueOwner}, I've memorized your address.`
        const resp = octokit.rest.issues.createComment({
            owner: payload.repository.owner.login,
            repo: payload.repository.name,
            issue_number: issueNumber,
            body: comment,
        });
        console.log(resp);

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
    "pull_request.closed"
], async ({id, name, payload}) => {
    const issueNumber = payload.number;

    const userLogin = payload.pull_request.user.login;
    const baseOwner = payload.repository.owner.login;
    const baseRepo = payload.repository.name;

    // ignore unmerged pull requests
    if (!payload.pull_request.merged) {
        return
    }

    const contributor = findContributor(userLogin)
    if (!contributor) {
        return
    }

    console.log("found contributor", contributor)

    const response = await fetch(payload.pull_request.diff_url);
    const diffText = await response.text();
    const diffs = parseDiff(diffText);
    console.log(diffs);

    const karma = calculateKarma(payload.pull_request, diffs)
    const recipientAddress = "0xc1e42f862d202b4a0ed552c1145735ee088f6ccf";
    const amount = web3.utils.toWei(karma.toString());
    const rawTransaction = await signTransaction(tokenContract, privateKey, recipientAddress, amount);
    sendTransaction(rawTransaction, (txHash) => {
        const comment = `Hi @${userLogin},
        
Well done! ${karma} BBG has been sent to your polygon wallet. Please check the following tx:

<https://polygonscan.com/tx/${txHash}>

Thank you for your contribution! 
`

        const resp = octokit.rest.issues.createComment({
            owner: baseOwner,
            repo: baseRepo,
            issue_number: issueNumber,
            body: comment,
        });
        console.log(resp);
    });
})


webhooks.on([
    "pull_request.opened"
], ({id, name, payload}) => {
    const issueNumber = payload.number;

    const userLogin = payload.pull_request.user.login;
    const baseOwner = payload.repository.owner.login;
    const baseRepo = payload.repository.name;
    const contributor = findContributor(userLogin)

    if (contributor) {
        const comment = `Welcome back! @${userLogin}`
        const resp = octokit.rest.issues.createComment({
            owner: baseOwner,
            repo: baseRepo,
            issue_number: issueNumber,
            body: comment,
        });
        console.log(resp);
    } else {
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
    }

})

webhooks.on([
    "pull_request.opened",
    "pull_request.reopened",
    "pull_request.synchronize"
], async ({id, name, payload}) => {
    const baseOwner = payload.repository.owner.login;
    const baseRepo = payload.repository.name;

    const userLogin = payload.pull_request.user.login;
    const diffUrl = payload.pull_request.diff_url;
    const issueNumber = payload.number;
    const state = payload.pull_request.state;

    const response = await fetch(diffUrl);
    const diffText = await response.text();
    const diffs = parseDiff(diffText);

    const karma = calculateKarma(payload.pull_request, diffs)
    const comment = `Karma: this pull request may get karma: ${karma} BBG`
    const resp = octokit.rest.issues.createComment({
        owner: baseOwner,
        repo: baseRepo,
        issue_number: issueNumber,
        body: comment,
    });
    console.log(resp);
});


const main = async () => {
    console.log("connecting mongodb...")
    await mongoClient.connect();
    console.log("mongodb connected")

    if (process.env.DEV_PROXY) {
        console.log("starting event proxy...")
        const EventSource = require('eventsource')
        const webhookProxyUrl = process.env.DEV_PROXY; // replace with your own Webhook Proxy URL
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
    }
    require("http").createServer(createNodeMiddleware(webhooks)).listen(3301);
};
main();
