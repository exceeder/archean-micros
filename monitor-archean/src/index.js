const express = require('express');
const redis = require('redis');
const path = require('path');
const Client = require('kubernetes-client').Client
const Request = require('kubernetes-client/backends/request')

const port = 3000
const app = express()

const kubeNamespace = 'default';

app.use('/archean', express.static(path.join(__dirname, 'public')))

const plainTextPropertiesToObj = text => text.split("\n")
    .map(l => l.split(":"))
    .filter(s => s.length > 1)
    .reduce((acc, x) => { acc[x[0]] = x[1].trim(); return acc; }, {});

const sendError = (res, err) =>  res.status(500)
    .contentType("application/json")
    .send(JSON.stringify({error: err ? err.message : '?'}))

app.get("/archean/v1/redis-stats", async (req, res) => {
    const client = redis.createClient({host:"redis-master", port:6379})
    client.info((err, reply) => {
        if (err || !reply) {
            return sendError(res, err);
        }
        const stats = plainTextPropertiesToObj(reply)
        res.send(JSON.stringify({stats:stats}))
    });

})

const getKubeClent = async () => {
    const backend = new Request(Request.config.getInCluster())
    const client = new Client({ backend })
    await client.loadSpec()
    return client
}

app.get("/archean/v1/pods", async (req, res) => {
    try {
        const client = await getKubeClent()
        const pods = await client.api.v1.namespaces(kubeNamespace).pods.get()
        res.contentType("application/json").send(JSON.stringify(pods))
    } catch (e) {
       sendError(res, e)
    }
})

app.get("/archean/v1/deployments", async (req, res) => {
    try {
        const client = await getKubeClent()
        const deployments = await client.apis.apps.v1.namespaces(kubeNamespace).deployments().get()
        res.contentType("application/json").send(JSON.stringify(deployments))
    } catch (e) {
        sendError(res, e)
    }
})


app.get("/archean/v1/pods/:name/logs", async (req, res) => {
    try {
        const client = await getKubeClent()
        let logs = await client.api.v1.namespaces(kubeNamespace).pods(req.params.name).log.get()
        res.contentType("text/simple").send(logs.body)
    } catch (e) {
        sendError(res, e)
    }
})


//cluster announcer
const publisher = redis.createClient({host:"redis-master", port:6379})
setInterval(() => publisher.publish("heartbeat", `http://${process.env.MY_POD_IP}:3000\n/archean`), 2000)

//http server
app.listen(port, '0.0.0.0', () => console.log(`Updater at IP ${process.env.MY_POD_IP} listening on port ${port}!`))