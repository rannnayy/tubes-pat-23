const amqp = require('amqplib');

const rabbitMQ = {
    connection: null,
    channel: null,

    async connect() {
        if (!this.connection) {
            this.connection = await amqp.connect(`amqp://${process.env.RABBITMQ_HOST}`);
        }
        return this.connection;
    },

    async createChannel() {
        if (!this.connection) {
            await this.connect();
        }
        if (!this.channel) {
            this.channel = await this.connection.createChannel();
        }
        return this.channel;
    },

    async getChannel() {
        if (!this.channel) {
            await this.createChannel();
        }
        return this.channel;
    }
};

module.exports = rabbitMQ;
