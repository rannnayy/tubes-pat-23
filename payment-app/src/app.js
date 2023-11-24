const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
const uuid = require('uuid');
const rabbitMQ = require('./rabbitmq');
const { processQueueMessage, simulatePayment } = require('./utils');
const { Invoice, Log } = require('./db');

const app = express();
const PORT = 5000;
const queueName = 'invoice_queue';

app.use(bodyParser.json());

const TICKET_WEBHOOK_URL = process.env.TICKET_WEBHOOK_URL || 'http://localhost:4000/webhook';
const CALLBACK_WEBHOOK_URL = process.env.CALLBACK_WEBHOOK_URL || 'http://localhost:5000/webhook';

rabbitMQ.setConsumer(queueName, processQueueMessage);
rabbitMQ.createChannel();

app.post('/invoice', async (req, res) => {
    try {
        const { amount, customer_name } = req.body;

        const invoiceId = uuid.v4();
        const webhookUrl = `${CALLBACK_WEBHOOK_URL}?invoiceId=${invoiceId}`;

        await Invoice.create({
            amount,
            customer_name,
            invoiceId,
            webhookUrl,
        });

        res.json({ invoiceId, webhookUrl });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/webhook', async (req, res) => {
    try {
        const { invoiceId } = req.query;
        const dataToEnqueue = { invoiceId, timestamp: new Date() };

        const rabbitMQChannel = await rabbitMQ.getChannel();
        await rabbitMQChannel.assertQueue(queueName, { durable: true, persistent: true });
        rabbitMQChannel.sendToQueue(queueName, Buffer.from(JSON.stringify(dataToEnqueue)), { persistent: true });

        console.log(`Webhook request received for invoice ID: ${invoiceId}, data enqueued for processing`);
        res.status(200).send('Webhook request received');
    } catch (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
    }
});


app.listen(PORT, () => {
    console.log(process.env)
    console.log(`Server is running on port ${PORT}`);
});