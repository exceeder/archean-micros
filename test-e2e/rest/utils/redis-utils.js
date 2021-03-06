const redis = require('redis');
const {promisify} = require('util');

function createRedisClient() {
    return new Promise((resolve, reject) => {
        const redisClient = redis.createClient({host: "backend-redis", port: 6379})
        redisClient
            .on('error', (err) => console.log(err))
            .on('ready', () => {
                //console.debug(`Connected to Redis ${redisClient.address}`)
                resolve({
                    client: redisClient,
                    get : promisify(redisClient.get).bind(redisClient),
                    lrange : promisify(redisClient.lrange).bind(redisClient),
                    rpush : promisify(redisClient.rpush).bind(redisClient),
                    ltrim : promisify(redisClient.ltrim).bind(redisClient),
                    incrby : promisify(redisClient.incrby).bind(redisClient)
                })
            })
    })
}

module.exports = createRedisClient;