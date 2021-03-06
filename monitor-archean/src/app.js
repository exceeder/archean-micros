const express = require('express');
const redis = require('redis');
const path = require('path');
const Client = require('kubernetes-client').Client
const Request = require('kubernetes-client/backends/request')
const KubeSubscription = require('./controllers/kube-subscription')
const port = 3000
const app = express()

const kubeNamespace = 'default';
let client = null;

app.use('/archean', express.static(path.join(__dirname, 'public')))

const convertPlainTextPropertiesToObject = text => text.split("\n")
    .map(l => l.split(":"))
    .filter(s => s.length > 1)
    .reduce((acc, x) => { acc[x[0]] = x[1].trim(); return acc; }, {});

const sendError = (res, err) =>  res.status(500)
    .contentType("application/json")
    .send(JSON.stringify({error: err ? err.message : '?'}))

app.get("/archean/v1/redis-stats", async (req, res) => {
    const client = redis.createClient({host:"backend-redis", port:6379})
    client.info((err, reply) => {
        if (err || !reply) {
            return sendError(res, err);
        }
        const stats = convertPlainTextPropertiesToObject(reply)
        res.send(JSON.stringify({stats:stats}))
    });
})

app.get("/archean/v1/pods", async (req, res) => {
    try {
        const pods = await client.api.v1.namespaces(kubeNamespace).pods.get({
            qs: { labelSelector: 'repo=archean-micros'}
        })
        res.contentType("application/json").send(JSON.stringify(pods))
    } catch (e) {
       sendError(res, e)
    }
})

app.get("/archean/v1/deployments", async (req, res) => {
    try {
        const deployments = await client.apis.apps.v1.namespaces(kubeNamespace)
            .deployments().get({ qs: { labelSelector: 'repo=archean-micros'}})
        res.contentType("application/json").send(JSON.stringify(deployments))
    } catch (e) {
        sendError(res, e)
    }
})

app.get("/archean/v1/pods/:name/logs", async (req, res) => {
    try {
        let logs = await client.api.v1.namespaces(kubeNamespace).pods(req.params.name).log.get()
        res.contentType("text/simple").send(logs.body)
    } catch (e) {
        sendError(res, e)
    }
})

app.get('/archean/v1/events', async (req, res) => {
    // SSE Setup
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });
    res.write('\n');
    new KubeSubscription(client).subscribe(req, res)
})

new Promise(async (resolve, reject) => {
    try {
        //connect to in-pod kubernetes client
        const backend = new Request(Request.config.getInCluster())
        const k8sClient = new Client({ backend })
        await k8sClient.loadSpec()
        resolve(k8sClient);
    } catch (e) {
        reject(e);
    }
}).then(k8sClient => {
    client = k8sClient;
    //http server
    app.listen(port, '0.0.0.0', () => console.log(`Updater at IP ${process.env.MY_POD_IP} listening on port ${port}!`))

    //cluster announcer
    const publisher = redis.createClient({host: "backend-redis", port: 6379})
    publisher
        .on('error', (err) => console.log(err.message))
        .on('ready', () =>
            setInterval(() =>
                publisher.publish("heartbeat", `http://${process.env.MY_POD_IP}:${port}\n/archean`), 2000)
        );
}).catch(e => console.log(e));