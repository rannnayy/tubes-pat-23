# Ticket App

## API Docs
Ticket App, responsible for seats, events, and bookings. 

### HTTP APIs
Please refer to the given postman collection. 

## How To Start
To start the whole application, please hit this endpoint, and add the body

```
http://localhost:6000/api/events/
{
    "event_name": "DummyEvent",
    "event_date": "2023-11-23",
    "event_desc": "JustADummyEvent",
    "event_num_seat": 50
}
```
That endpoint will give you the seed data needed for playing around with our implementation.

To run the whole application, please do `docker-compose up --build` 
