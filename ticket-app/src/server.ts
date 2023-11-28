import express, { Request, Response } from 'express';
import { PrismaClient } from '../node_modules/.prisma/client'
import bodyParser from "body-parser";

var Stomp = require('stomp-client');
var destination = '/queue/bookings';
var StompClient = new Stomp('127.0.0.1', 61613, 'admin', 'admin');

const qr = require('qrcode');
const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');

async function generateQR(urlToEncode : string) {
    const imagePath = './src/output/'+urlToEncode+'.png'
    const pdfPath = './src/output/'+urlToEncode+'.pdf'
    await qr.toFile(imagePath, urlToEncode, { type: 'image/png' });
	const image = await fs.promises.readFile(imagePath, );
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

const app = express();
app.use(bodyParser.json());
const port = 6000;

var payment_endpoint = 'http://localhost:5000';

app.get('/', (req: Request, res: Response) => {
    res.send('Hello, World!');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

const prisma = new PrismaClient();

app.get('/webhook', function(req: any, res: any) {
    console.log(req.body);
    
    res.status(200).end();
})

app.post("/api/events", async (req: any, res: any) => {
    try {
        const { event_name, event_date, event_desc, event_num_seat } = req.body
		let seats = [];
		for (let i=0; i < event_num_seat; i++) {
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
					create: seats.map((seat_status: string) => ({
						seat_status: "OPEN",
					}))
				}
            },
        })
		
        res.json(newEvent)
    } catch (error: any) {
        console.log(error.message)
        res.status(500).json({
            message: "Internal Server Error",
        })
    }
})

app.get("/api/events/event_id/:event_id", async (req: any, res: any) => {
    try {
        const event = await prisma.event.findFirstOrThrow({
            where: { event_id: req.params.event_id?.toString() },
            include: { event_bookings: false },
        })
        res.json(event)
    } catch (error) {
        res.status(500).json({
            message: "Something went wrong",
        })
    }
})

app.get("/api/events/", async (req: any, res: any) => {
    try {
        const event = await prisma.event.findMany({
            include: { 
				event_bookings: true,
				event_seat: true
			},
        })
        res.json(event)
    } catch (error) {
        res.status(500).json({
            message: "Something went wrong",
        })
    }
})

app.put("/api/events/event_id/:event_id", async (req: any, res: any) => {
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
                event_date: event_date,
                event_desc: event_desc,
                event_num_seat: event_num_seat,
            },
        })
		console.log(updatedEvent);
        res.json(updatedEvent)
    } catch (error) {
        res.status(500).json({
        	message: "Something went wrong",
        })
    }
})

app.delete("/api/events/event_id/:event_id", async (req: any, res: any) => {
    try {
        const event_id = req.params.event_id?.toString()
        const deletedEvent = await prisma.event.delete({
            where: { event_id, },
        })
        res.json(deletedEvent)
    } catch (error) {
        res.status(500).json({
            message: "Something went wrong",
        })
    }
})

app.get("/api/seats/:seat_id", async (req: any, res: any) => {
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

app.get("/api/seats/", async (req: any, res: any) => {
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
app.post("/api/booking/event_id/:event_id/seat_id/:seat_id/user_id/:user_id", async (req: any, res: any) => {
    if (Math.floor(Math.random() * 10) in [0, 1]) {
        console.log(
            'Booking failed, please try again!'
        )
        res.json('fail');
    } else {
        try {
            const bookings_event_id = req.params.event_id.toString();
            const bookings_seat_id = req.params.seat_id.toString();
            const bookings_buyer = req.params.user_id.toString();
            const { bookings_created, bookings_updated } = req.body
			console.log(bookings_event_id, bookings_seat_id, bookings_buyer, bookings_created, bookings_updated);

            const newBooking = await prisma.bookings.create({
                data: {
                    bookings_created: new Date(bookings_created),
                    bookings_updated: new Date(bookings_updated),
                    bookings_buyer: bookings_buyer,
                    bookings_event_id: bookings_event_id,
                    bookings_seat_id: bookings_seat_id,
                    payment_url: '',
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
            
            const response : any = await fetch(payment_endpoint+'/webhook/'+String(booking_id));
            console.log("HMMMMMMMMMMMMMMMMMMMMMMMMM");
            // console.log(response);
            // const json : any = await response.json();
            // console.log("SINIIIIIIIIIIIIIIIIIIIIIIIII")
            // console.log(json);
            const json = {
                payment_url: '123456',
            }
            
            const updatedBooking = await prisma.bookings.update({
                where: { bookings_id: booking_id, },
                data: {
                    payment_url: json.payment_url.toString()
                },
            })

            generateQR(json.payment_url.toString())
            .then(() => {
                console.log('Image converted to PDF successfully!');
                res.download('./src/output'+booking_id.toString()+'.pdf')
            })
            .catch((error) => {
                console.error('Error converting image to PDF:', error);
            });
            
            // res.download('./src/output'+json.payment_url.toString()+'.pdf')
        } catch (error: any) {
            if (error.code === 'P2002') {
                let error_message = "Unique constraint violation - Either the event is fully booked or the seat was taken";
                generateQR(error_message)
                .then(() => {
                    console.log('Image converted to PDF successfully!');
                    res.status(500).download('./src/output'+error_message+'.pdf')
                })
                .catch((error) => {
                    console.error('Error converting image to PDF:', error);
                });
            } else {
                let error_message = 'Internal Server Error'
                generateQR(error_message)
                .then(() => {
                    console.log('Image converted to PDF successfully!');
                    res.status(500).download('./src/output'+error_message+'.pdf')
                })
                .catch((error) => {
                    console.error('Error converting image to PDF:', error);
                });
            }
        }
    }
})

// Get All Bookings
app.get("/api/bookings/", async (req: any, res: any) => {
    try {
        const bookings = await prisma.bookings.findMany()
        res.json(bookings)
    } catch (error) {
        res.status(500).json({
            message: "Something went wrong",
        })
    }
})

app.get("/api/bookings/:bookings_id", async (req: any, res: any) => {
    try {
        const bookings_id = req.params.bookings_id
        const bookings = await prisma.bookings.findMany({
            where: { bookings_id, }
        })

        res.json(bookings)
    } catch (error) {
        res.status(500).json({
            message: "Something went wrong",
        })
    }
})

app.get("/api/bookings/:bookings_id/status", async (req: any, res: any) => {
    try {
        const bookings_id = req.params.bookings_id
        const bookings = await prisma.bookings.findMany({
            where: { bookings_id, },
            include: { bookings_seat: {
                select: {
                    seat_status: true,
                }
            }},
        })

        res.json(bookings)
    } catch (error) {
        res.status(500).json({
            message: "Something went wrong",
        })
    }
})