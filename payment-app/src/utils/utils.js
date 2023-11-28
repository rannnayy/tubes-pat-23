const { Log } = require('../database/db'); // Adjust the path as needed

const TICKET_WEBHOOK_URL = process.env.TICKET_WEBHOOK_URL || 'http://localhost:4000/webhook';

// Ganti jadi 0.1 nanti
function simulatePayment() {
    const isSuccessful = Math.random() > 0.5;
    return isSuccessful;
}

async function processQueueMessage(msg) {
    // Simulate payment process timeout 2 second
    await new Promise(resolve => setTimeout(resolve, 2000));
    const { invoiceId, bookingId } = JSON.parse(msg.content);

    console.log("Simulating payment process with 10% failure...")
    const isSuccessful = simulatePayment();
    const webhookUrl = `${TICKET_WEBHOOK_URL}?invoiceId=${invoiceId}&bookingId=${bookingId}&success=${isSuccessful ? 'true' : 'false'}`;

    console.log(`Result for invoice ID: ${invoiceId}, booking ID: ${bookingId}, payment Status: ${isSuccessful ? 'Success' : 'Failure'}`)

    try {
        const status = isSuccessful ? 'success' : 'failure';
        await Log.create({
            invoiceId,
            bookingId,
            status,
            timestamp: new Date(),
        });
        console.log('Log entry saved in the database.');
        console.log(`Calling the success/fail webhook: ${webhookUrl}`);
        await fetch(webhookUrl, { method: 'GET' });
        console.log('Webhook called successfully.');
    } catch (error) {
        console.error('Error in sending the webhook! ');
        throw (error);
    }
}

module.exports = { processQueueMessage, simulatePayment };