const amqp = require('amqplib');

const rabbitMQ = {
    connection: null,
    channel: null,
    callback: null,
    queueName: null,

    async connect() {
        try {
            console.log("Trying connect...")
            this.connection = await amqp.connect(`amqp://${process.env.RABBITMQ_HOST}?heartbeat=10`);
            this.setupConnectionHandlers();
            this.channel = null;
            await this.createChannel();
            await this.setupConsumer();
            return this.connection;
        } catch (err) {
            this.handleConnectionError(err);
        }
    },

    setupConnectionHandlers() {
        this.connection.on("error", (err) => {
            if (err.message !== "Connection closing") {
                console.error("[AMQP] conn error", err.message);
            }
        });
        this.connection.on("close", () => {
            console.error("[AMQP] reconnecting");
            setTimeout(() => this.connect(), 5000);
        });
    },

    handleConnectionError(err) {
        this.setupConnectionHandlers();
        console.error(err);
        setTimeout(() => this.connect(), 5000);
    },

    async createChannel() {
        if (!this.connection || this.connection.closed) {
            await this.connect();
        }
        if (!this.channel || this.channel.closed) {
            this.channel = await this.connection.createChannel();
            this.channel.prefetch(1);
        }
        return this.channel;
    },

    async getChannel() {
        try {
            if (!this.channel || this.channel.closed) {
                await this.createChannel();
            }
            return this.channel;
        } catch (err) {
            console.log(err);
            throw err;
        }
    },

    async close() {
        if (this.channel) {
            await this.channel.close();
        }
        if (this.connection) {
            await this.connection.close();
        }
    },

    setConsumer(queueName, callback) {
        this.queueName = queueName;
        this.callback = callback;
    },

    async setupConsumer() {
        try {
            const rabbitMQChannel = await this.getChannel();
            await rabbitMQChannel.assertQueue(this.queueName, { durable: true });

            rabbitMQChannel.consume(this.queueName, async (msg) => {
                try {
                    console.log("Processing message... " + msg.content)
                    await this.callback(msg);
                    rabbitMQChannel.ack(msg);
                } catch (err) {
                    console.error("Failed to hit Webhook for content " + msg.content + " Queing it back...");
                    rabbitMQChannel.nack(msg, false, true);
                }
            });

            console.log('Queue listener is set up and running.');
        } catch (err) {
            console.error('Error setting up the queue listener:', err);

        }
    }
};

module.exports = rabbitMQ;
