require('dotenv').config();
const { v4: uuid } = require('uuid');
const fastify = require('fastify');

const { createClient } = require('redis');

const {
    HOST: host = '0.0.0.0',
    PORT: port = '3000',
    REDIS_HOST: redisHost = '127.0.0.1',
    REDIS_PORT: redisPort = '6379'
} = process.env;

const redisClientOptions = {
    url: `redis://${redisHost}:${redisPort}`,
};

const build = (opts = {}) => {
    const app = fastify(opts);

    app.get('/items', async (req, reply) => {
	const client = createClient(redisClientOptions);
	await client.connect();
	const items = await client.keys('items:*');
	let responsePayload = [];
	if(items) {
	    responsePayload = items.map(i => i.substr('items:'.length));
	}
	reply.code(200)
	    .header('x-request-id', uuid())
	    .header('x-request-duration', 0.34)
	    .header('x-server-version', '0.0.1')
	    .send({etag: uuid(), items: responsePayload});
	await client.quit();
    });

    app.get('/items/:itemId', async (req, reply) => {
	const { itemId } = req.params;
	const client = createClient(redisClientOptions);
	await client.connect();
	client.on('error', (err) => {
	    app.log.error({err}, `An error occurred with redis connection ${err.message || err}`);
	});
	const value = await client.get(`items:${itemId}`);
	reply.code(200)
	    .header('x-request-id', uuid())
	    .header('x-request-duration', 0.22)
	    .header('x-server-version', '0.0.1')
	    .header('content-type', 'application/json')
	    .send(value);
	await client.quit();
    });

    app.post('/items', async (req, reply) => {
	const { body } = req;
	const itemId = uuid();
	const item = {...body, id: itemId};
	app.log.debug('persisting the item');
	const client = createClient(redisClientOptions);
	client.connect();
	await client.set(`items:${itemId}`, JSON.stringify(item));
	reply.code(201)
	    .header('x-request-id', uuid())
	    .header('x-request-duration', 1)
	    .header('x-server-version', '0.0.1')
	    .header('content-type', 'application/json')
	    .send({get: `/items/${itemId}`});
	await client.quit();
    });
    
    app.get('/', async (req, reply) => {
	
	reply.code(200)
	    .header('x-request-id', uuid())
	    .header('x0request-duration', 0.22)
	    .header('x-server-version', '0.0.1')
	    .send({code: 0, message: 'ok'});
    });
    return app;
};

const start = async (app, host, port) => {
    try {
	const addr = await app.listen(port, host);
	app.log.info(`Application started ${addr}`);
    } catch (err) {
	app.log.error(err);
	throw err;
    }
};

const app = build({logger: true});

start(app, host, port).then(() => {
    app.log.info('application started');
}).catch(err => {
    console.error(err.message || err);
    process.exit(1);
});
