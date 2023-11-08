const { Log } = require('./db'); // Adjust the path as needed

const TICKET_WEBHOOK_URL = process.env.TICKET_WEBHOOK_URL || 'http://localhost:4000/webhook';
const CALLBACK_WEBHOOK_URL = process.env.CALLBACK_WEBHOOK_URL || 'http://localhost:5000/webhook';

// Ganti jadi 0.1 nanti
function simulatePayment() {
    const isSuccessful = Math.random() > 0.5;
    return isSuccessful;
}

async function processQueueMessage(msg) {
    const invoiceId = JSON.parse(msg.content).invoiceId;

    const isSuccessful = simulatePayment();
    const webhookUrl = `${TICKET_WEBHOOK_URL}?invoiceId=${invoiceId}&status=${isSuccessful ? 'success' : 'failure'}`;

    console.log(`Webhook received for invoice ID: ${invoiceId}, Payment Status: ${isSuccessful ? 'Success' : 'Failure'}`);
    console.log(`Calling the success/fail webhook: ${webhookUrl}`);
    try {
        const status = isSuccessful ? 'success' : 'failure';
        await Log.create({
            invoiceId,
            status,
            timestamp: new Date(),
        });
        console.log('Log entry saved in the database.');
    } catch (error) {
        console.error('Error saving log entry:', error);
    }
}

module.exports = { processQueueMessage, simulatePayment };