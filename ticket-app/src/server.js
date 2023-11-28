require('dotenv').config();

const express = require('express');
const { PrismaClient } = require('.prisma/client')
const bodyParser = require("body-parser");

const qr = require('qrcode');
const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');
const url = require('url');

const app = express();
app.use(bodyParser.json());
app.use(express.json());
const port = 4000;

var payment_endpoint = 'http://payment:5000';
var client_endpoint = 'http://clientapp:3000';

const rabbitMQ = require('./mq/rabbitmq');
const queueName = 'bookings';
async function processQueueMessage(msg) {
    return;
}
rabbitMQ.setConsumer(queueName, processQueueMessage);
rabbitMQ.createChannel();

async function generateQR(urlToEncode) {
    const imagePath = '../public/output/' + urlToEncode + '.png'
    const pdfPath = '../public/output/' + urlToEncode + '.pdf'
    await qr.toFile(imagePath, urlToEncode, { type: 'image/png' });
    const image = await fs.promises.readFile(imagePath,);
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([400, 400]);
    const imageEmbed = await pdfDoc.embedPng(image);
    const { width, height } = imageEmbed.scaleToFit(
        page.getWidth(),
        page.getHeight(),
    );

    page.drawImage(imageEmbed, {
        x: page.getWidth() / 2 - width / 2,
        y: page.getHeight() / 2 - height / 2,
        width,
        height,
        color: rgb(0, 0, 0),
    });
    const pdfBytes = await pdfDoc.save();
    await fs.promises.writeFile(pdfPath, pdfBytes);
}

app.get('/', (req, res) => {
    res.send('Hello, World!');
});

app.listen(port, async () => {
    console.log(`Server running at http://ticketapp:${port}`);
    // console.log(payment_endpoint + '/invoice');
    // let response = await fetch(payment_endpoint + '/invoice', {
    //     method: 'POST',
    //     body: JSON.stringify({
    //         amount: 100,
    //         bookingId: "HMXJFKDL"
    //     }),
    //     headers: {
    //         'Content-type': 'application/json; charset=UTF-8',
    //     }
    // })
    // console.log(response);
});


// // ActiveMQ
// var stompit = require('stompit');
// var destination = '/queue/bookings';

// var connectionManager = new stompit.ConnectFailover([
//     {
//         host: 'mq',
//         port: 61616,
//         resetDisconnect: false,
//         connectHeaders: {
//             'host': '/',
//             login: 'admin',
//             passcode: 'admin',
//             'heart-beat': '5000,5000'
//         }
//     }
// ]);

// connectionManager.on('error', function (error ) {
//     var connectArgs = error.connectArgs;
//     var address = connectArgs.host + ':' + connectArgs.port;
//     console.log('Could not connect to ' + address + ': ' + error.message);
// });

// connectionManager.on('connecting', function (connector ) {
//     console.log('Connecting to ' + connector.serverProperties.remoteAddress.transportPath);
// });

// var channelPool = new stompit.ChannelPool(connectionManager);
// var channelFactory = new stompit.ChannelFactory(connectionManager);

// channelPool.channel(function (error, channel) {
//     if (error) {
//         console.log('subscribe-channel error: ' + error.message);
//         return;
//     }

//     var subscribeHeaders = {
//         destination: destination,
//         headers: {
//             'activemq.prefetchSize': 1
//         }
//     };

//     channel.subscribe(subscribeHeaders, function (error, message, subscription) {
//         if (error) {
//             console.log('subscribe error: ' + error.message);
//             return;
//         }

//         message.readString('utf8', async function (error, body) {
//             if (error) {
//                 console.log('read message error ' + error.message);
//                 return;
//             }

//             // Dequeue, send, publish/enqueue
//             const dataReceived = body;

//             let response = await fetch(client_endpoint + '/api/bookings', {
//                 method: 'POST',
//                 body: JSON.stringify({
//                     status: true,
//                     pdf_url: url.pathToFileURL('./src/output/' + body.booking_id.toString() + '.pdf'),
//                 }),
//                 headers: {
//                     'Content-type': 'application/json; charset=UTF-8',
//                 }
//             })
//                 .then((response) => {
//                     if (response.status == 200) {
//                         const updatedBooking = prisma.bookings.update({
//                             where: { bookings_id: body.booking_id, },
//                             data: {
//                                 payment_url: body.webhook_url.toString()
//                             },
//                         })

//                         const seatID = prisma.bookings.findFirstOrThrow({
//                             where: { bookings_id: body.booking_id },
//                             include: {
//                                 bookings_event: false,
//                                 bookings_seat: false
//                             }
//                         })
//                         console.log(seatID);
//                         console.log(url.pathToFileURL('./src/output/' + body.booking_id.toString() + '.pdf'));

//                         generateQR(body.booking_id.toString())
//                             .then(() => {
//                                 body.status(200).json({
//                                     'status': 'true',
//                                     'pdf_url': './src/output/' + body.booking_id.toString() + '.pdf'
//                                 })
//                             })
//                             .catch((error) => {
//                                 channelFactory.channel(function (error, channel) {

//                                     if (error) {
//                                         console.log('channel factory error: ' + error.message);
//                                         return;
//                                     }

//                                     var headers = {
//                                         'destination': destination
//                                     };

//                                     channel.send(headers, body, function (error) {
//                                         if (error) {
//                                             console.log('send error: ' + error.message);
//                                             return;
//                                         }

//                                         console.log('enqueue back');
//                                     });
//                                 });
//                                 body.status(500).json({
//                                     'status': 'false',
//                                    'pdf_url': ''
//                                 })
//                             });

//                         // const seat = prisma.seat.update({
//                         //     where: {
//                         //         seat_id: seatID,
//                         //     },
//                         //     data: { 
//                         //         seat_status: "BOOKED",
//                         //     }
//                         // })

//                     } else {
//                         console.log("Client is unable to receive webhook!");
//                     }
//                 })

//         });
//     });
// });
async function processQueueMessage(msg) {
    // Throw error to let the message back in queue
    let { invoiceId, bookingId, status } = JSON.parse(msg.content);
    if (invoiceId === undefined || bookingId === undefined || status === undefined) {
        // Just ack this bad message
        return;
    }
    console.log("Processing message... Simulating 2 second delay" + msg.content)
    // 2 second delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(invoiceId, bookingId, status);

    // Update database
    const updatedBooking = await prisma.bookings.update({
        where: { bookings_id: bookingId, },
        data: {
            payment_url: status.toString()
        },
    })

    const seatID = await prisma.bookings.findFirstOrThrow({
        where: { bookings_id: bookingId },
        include: {
            bookings_event: false,
            bookings_seat: false
        }
    })

    const seatStatus = status === "success" ? "BOOKED" : "OPEN";

    const seat = await prisma.seat.update({
        where: {
            seat_id: seatID,
        },
        data: {
            seat_status: seatStatus,
        }
    })
    console.log(seatID);
    // TODO, BLOCK / UNBLOCK SEATID

    console.log(url.pathToFileURL('../public/output/' + bookingId.toString() + '.pdf'));
    await generateQR(bookingId.toString());

    console.log("Notifying client...")
    // PDF in /public/output
    let response = await fetch(client_endpoint + '/api/bookings', {
        method: 'PATCH',
        body: JSON.stringify({
            status: true,
            pdf_url: url.pathToFileURL('./public/output/' + bookingId.toString() + '.pdf'),
        }),
        headers: {
            'Content-type': 'application/json; charset=UTF-8',
        }
    })

    if (response.status !== 200) {
        throw new Error('Failed to hit Webhook for content ' + msg.content + ' Queing it back...');
    }
    console.log("Finish processing message");
}
// Endpoints

const prisma = new PrismaClient();

app.get('/webhook', async function (req, res) {
    try {
        const { invoiceId, bookingId, status } = req.query;
        const dataToEnqueue = { invoiceId, bookingId, status, timestamp: new Date() };

        const rabbitMQChannel = await rabbitMQ.getChannel();
        await rabbitMQChannel.assertQueue(queueName, { durable: true, persistent: true });
        rabbitMQChannel.sendToQueue(queueName, Buffer.from(JSON.stringify(dataToEnqueue)), { persistent: true });

        console.log(`Webhook request received for invoice ID: ${invoiceId}, data enqueued for processing`);
        res.status(200).send('Webhook request received');
    } catch (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
    }

    // console.log(req.body);
    // channelFactory.channel(function (error , channel ) {

    //     if (error) {
    //         console.log('channel factory error: ' + error.message);
    //         return;
    //     }

    //     var headers = {
    //         'destination': destination
    //     };

    //     channel.send(headers, req.bookingId, function (error ) {
    //         if (error) {
    //             console.log('send error: ' + error.message);
    //             return;
    //         }

    //         console.log('enqueue request');
    //     });
    // });

    // res.status(200).end();
})

app.post("/api/events", async (req, res) => {
    try {
        const { event_name, event_date, event_desc, event_num_seat } = req.body
        let seats = [];
        for (let i = 0; i < event_num_seat; i++) {
            const newSeat = 'OPEN'
            seats.push(JSON.stringify(newSeat));
        }
        const newEvent = await prisma.event.create({
            select: {
                event_id: true,
                event_name: true,
                event_date: true,
                event_desc: true,
                event_num_seat: true,
                event_bookings: true,
                event_seat: true
            },
            data: {
                event_name,
                event_date: new Date(event_date),
                event_desc,
                event_num_seat,
                event_bookings: {},
                event_seat: {
                    create: seats.map((seat_status) => ({
                        seat_status: "OPEN",
                    }))
                }
            },
        })

        res.json(newEvent)
    } catch (error) {
        console.log(error.message)
        res.status(500).json({
            message: "Internal Server Error",
        })
    }
})

app.get("/api/events/:event_id", async (req, res) => {
    try {
        const event = await prisma.event.findFirstOrThrow({
            where: { event_id: req.params.event_id?.toString() },
            include: { event_bookings: true, event_seat: true },
        })
        res.json(event)
    } catch (error) {
        res.status(500).json({
            message: "Something went wrong",
        })
    }
})

app.get("/api/events/", async (req, res) => {
    try {
        const event = await prisma.event.findMany({
            include: {
                event_bookings: true,
                event_seat: true
            },
        })
        console.log(event)
        res.json(event)
    } catch (error) {
        res.status(500).json({
            message: "Something went wrong",
        })
    }
})

app.put("/api/events/:event_id", async (req, res) => {
    try {
        const { event_name, event_date, event_desc, event_num_seat } = req.body;
        console.log(event_name, event_date, event_desc, event_num_seat);
        const event_id = req.params.event_id?.toString()
        console.log(event_id);

        const updatedEvent = await prisma.event.update({
            where: { event_id: event_id, },
            data: {
                event_id: event_id,
                event_name: event_name,
                event_date: new Date(event_date),
                event_desc: event_desc,
                event_num_seat: event_num_seat,
            }
        })

        const refreshedEvent = await prisma.event.findUnique({
            where: { event_id: event_id },
        });
        console.log(refreshedEvent)

        res.json(refreshedEvent)
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Something went wrong",
        })
    }
})

app.delete("/api/events/:event_id", async (req, res) => {
    try {
        const event_id = req.params.event_id?.toString()
        const deletedEvent = await prisma.event.delete({
            where: { event_id, },
        })
        res.json(deletedEvent)
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Something went wrong",
        })
    }
})

app.get("/api/seats/:seat_id", async (req, res) => {
    try {
        const seat = await prisma.seat.findFirstOrThrow({
            where: { seat_id: req.params.seat_id?.toString() },
        })
        res.json(seat)
    } catch (error) {
        res.status(500).json({
            message: "Something went wrong",
        })
    }
})

app.get("/api/seats/", async (req, res) => {
    try {
        const seat = await prisma.seat.findMany({

        })
        res.json(seat)
    } catch (error) {
        res.status(500).json({
            message: "Something went wrong",
        })
    }
})

// Create Booking
app.post("/api/booking", async (req, res) => {
    if (Math.floor(Math.random() * 10) in [0, 1]) {
        console.log(
            'Booking failed, please try again!'
        )
        res.json('fail');
    } else {
        try {
            console.log(req.body);
            const { event_id, seat_id, user_id, bookings_created, bookings_updated } = req.body
            console.log("CREATE BOOKING\n\t", event_id, seat_id, user_id, bookings_created, bookings_updated);

            const seat = await prisma.seat.findFirstOrThrow({
                include: {
                    seat_bookings: true,
                    seat_event: true
                },
                where: {
                    seat_id: seat_id,
                }
            })
            console.log(seat);

            if (seat.seat_status === "OPEN") {
                const newBooking = await prisma.bookings.create({
                    data: {
                        bookings_created: new Date(bookings_created),
                        bookings_updated: new Date(bookings_updated),
                        bookings_buyer: user_id,
                        bookings_event_id: event_id,
                        bookings_seat_id: seat_id,
                        payment_url: ""
                    },
                    select: {
                        bookings_id: true,
                        bookings_created: true,
                        bookings_updated: true,
                        bookings_buyer: true,
                        bookings_event: true,
                        bookings_event_id: true,
                        bookings_seat: true,
                        bookings_seat_id: true,
                        payment_url: true,
                    }
                })
                const booking_id = newBooking.bookings_id;
                console.log(booking_id);

                const seat = await prisma.seat.update({
                    where: {
                        seat_id: seat_id,
                    },
                    data: {
                        seat_status: "ONGOING",
                    }
                })

                console.log(payment_endpoint + '/invoice');
                console.log({
                    amount: 100,
                    bookingId: booking_id
                });

                let response = await fetch(payment_endpoint + '/invoice', {
                    method: 'POST',
                    body: JSON.stringify({
                        amount: 100,
                        bookingId: booking_id
                    }),
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    }
                })
                let responseJson = await response.json()
                console.log(responseJson)

                res.status(200).json({
                    'status': 'ONGOING',
                    'pdf_url': responseJson
                })
                console.log("Delivered the response!");

            } else {
                let error_message = "SeatNotAvailable";
                console.log(error_message)
                res.status(500).json({
                    'status': 'false',
                    'pdf_url': 'SeatNotAvailable'
                })
            }
        } catch (error) {
            if (error.code === 'P2002') {
                let error_message = "UniqueConstraintViolationEventFullyBookedOrSeatTaken";
                console.log(error_message);
                res.status(500).json({
                    'status': 'false',
                    'pdf_url': 'NotUnique'
                })
            } else {
                let error_message = 'InternalServerError'
                console.log(error_message + ' : ' + error);
                res.status(500).json({
                    'status': 'false',
                    'pdf_url': 'UnknownError'
                });
            }
        }
    }
})

// Get All Bookings
app.get("/api/bookings/", async (req, res) => {
    try {
        const bookings = await prisma.bookings.findMany()
        res.json(bookings)
    } catch (error) {
        res.status(500).json({
            message: "Something went wrong",
        })
    }
})

app.get("/api/bookings/:bookings_id", async (req, res) => {
    try {
        const bookings_id = req.params.bookings_id
        const bookings = await prisma.bookings.findMany({
            where: { bookings_id, },
            include: {
                bookings_seat: {
                    select: {
                        seat_status: true,
                    }
                }
            },
        })

        res.json(bookings)
    } catch (error) {
        res.status(500).json({
            message: "Something went wrong",
        })
    }
})