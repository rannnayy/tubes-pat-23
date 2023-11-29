package handlers

import (
	"bytes"
	"clientapp/database"
	"clientapp/types"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgtype"
)

// {event_id: "", chair_id: ""}

type BookingResponse struct {
	Success    bool   `json:"success"`
	Message    string `json:"message"`
	Status     string `json:"status"`
	BookingID  string `json:"bookings_id"`
	EventID    string `json:"bookings_event_id"`
	SeatID     string `json:"bookings_seat_id"`
	PaymentURL string `json:"payment_url"`
	InvoiceID  string `json:"invoice_id"`
	PdfURL     string `json:"pdf_url"`
}

func CreateBooking(c *fiber.Ctx) error {
	fmt.Println("CreateBooking")
	if err := types.Enforce(c); err != nil {
		return err
	}

	var err error
	sess, err := types.SessionStore.Get(c)
	if err != nil {
		return err
	}

	booking := new(database.CreateBookingIdParams)

	if err := c.BodyParser(booking); err != nil {
		return err
	}

	if err := booking.UserID.UnmarshalJSON(sess.Get("uid").([]byte)); err != nil {
		return err
	}

	if err := types.Validator.Validate(booking); err != nil {
		return err
	}

	agent_body := struct {
		EventId         string `json:"event_id"`
		SeatId          string `json:"seat_id"`
		UserId          string `json:"user_id"`
		BookingsCreated string `json:"bookings_created"`
		BookingsUpdated string `json:"bookings_updated"`
	}{
		EventId:         fmt.Sprintf("%x-%x-%x-%x-%x", booking.EventID.Bytes[0:4], booking.EventID.Bytes[4:6], booking.EventID.Bytes[6:8], booking.EventID.Bytes[8:10], booking.EventID.Bytes[10:16]),
		SeatId:          fmt.Sprintf("%x-%x-%x-%x-%x", booking.ChairID.Bytes[0:4], booking.ChairID.Bytes[4:6], booking.ChairID.Bytes[6:8], booking.ChairID.Bytes[8:10], booking.ChairID.Bytes[10:16]),
		UserId:          fmt.Sprintf("%x-%x-%x-%x-%x", booking.UserID.Bytes[0:4], booking.UserID.Bytes[4:6], booking.UserID.Bytes[6:8], booking.UserID.Bytes[8:10], booking.UserID.Bytes[10:16]),
		BookingsCreated: time.Now().Format("2006-01-02 15:04:05"),
		BookingsUpdated: time.Now().Format("2006-01-02 15:04:05"),
	}

	var agent_body_string []byte
	if agent_body_string, err = json.Marshal(agent_body); err != nil {
		return err
	}

	res, err := http.Post(fmt.Sprintf("%s/api/booking", os.Getenv("TICKET_APP")), "application/json", bytes.NewReader(agent_body_string))
	if err != nil {
		return err
	}
	var bookingResp BookingResponse

	err = json.NewDecoder(res.Body).Decode(&bookingResp)
	if err != nil {
		fmt.Println("Error parsing JSON:", err)
		return err
	}

	defer res.Body.Close()

	if res.StatusCode != 200 && res.StatusCode != 201 {
		// body is {status: "", pdf_url: ""}
		booking_failed := new(database.CreateBookingFailedParams)
		booking_failed.UserID = booking.UserID
		booking_failed.EventID = booking.EventID
		booking_failed.ChairID = booking.ChairID
		booking_failed.Status = database.BookingStatusFailure
		booking_failed.PdfUrl.Scan(bookingResp.PdfURL)

		if _, err = types.DbInstance.Queries.CreateBookingFailed(types.DbInstance.Ctx, *booking_failed); err != nil {
			return err
		}

		return &fiber.Error{
			Code:    fiber.StatusInternalServerError,
			Message: bookingResp.Message,
		}
	} else {
		pgTypeUUID := pgtype.UUID{}
		if err := pgTypeUUID.Scan(bookingResp.BookingID); err != nil {
			return err
		}

		booking.ID = pgTypeUUID

		if _, err = types.DbInstance.Queries.CreateBookingId(types.DbInstance.Ctx, *booking); err != nil {
			return err
		}
	}

	dataJSON, err := json.Marshal(bookingResp)
	if err != nil {
		return err
	}

	// Convert the JSON bytes to a string
	dataString := string(dataJSON)

	return c.Status(fiber.StatusCreated).JSON(&types.ResponseTemplate{
		Success: true,
		Message: dataString,
	})
}

func GetAllBooking(c *fiber.Ctx) error {
	if err := types.Enforce(c); err != nil {
		return err
	}

	sess, err := types.SessionStore.Get(c)
	if err != nil {
		return err
	}

	var uid pgtype.UUID
	if err := uid.UnmarshalJSON(sess.Get("uid").([]byte)); err != nil {
		return err
	}

	booking, err := types.DbInstance.Queries.GetAllBookingByUser(types.DbInstance.Ctx, uid)
	if err != nil {
		return err
	}

	booking_str, err := json.Marshal(booking)
	if err != nil {
		return err
	}

	if booking == nil {
		booking_str = []byte("[]")
	}

	return c.Status(fiber.StatusAccepted).JSON(&types.ResponseTemplate{
		Success: true,
		Message: string(booking_str),
	})
}

// {status: "", pdf_url: ""}
func UpdateBookingStatus(c *fiber.Ctx) error {
	param := new(database.UpdateBookingStatusParams)

	if err := param.ID.Scan(c.Params("id")); err != nil {
		return err
	}

	if err := c.BodyParser(param); err != nil {
		return err
	}

	if err := types.Validator.Validate(param); err != nil {
		return err
	}

	if err := types.DbInstance.Queries.UpdateBookingStatus(types.DbInstance.Ctx, *param); err != nil {
		return err
	}

	return c.Status(fiber.StatusAccepted).JSON(&types.ResponseTemplate{
		Success: true,
		Message: "Booking Updated",
	})
}

func DeleteBooking(c *fiber.Ctx) error {
	var bookingId pgtype.UUID
	if err := bookingId.Scan(c.Params("id")); err != nil {
		return err
	}

	client := &http.Client{}

	// create a new DELETE request
	req, err := http.NewRequest("DELETE", fmt.Sprintf("%s/api/booking/booking_id/%s", os.Getenv("TICKET_APP"), c.Params("id")), nil)
	if err != nil {
		panic(err)
	}

	// send the request
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return &fiber.Error{
			Code:    fiber.StatusInternalServerError,
			Message: "Internal call error",
		}
	}

	if err := types.DbInstance.Queries.DeleteBooking(types.DbInstance.Ctx, bookingId); err != nil {
		return err
	}

	return c.Status(fiber.StatusAccepted).JSON(&types.ResponseTemplate{
		Success: true,
		Message: "Booking Deleted",
	})
}
