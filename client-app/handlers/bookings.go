package handlers

import (
	"bytes"
	"clientapp/database"
	"clientapp/types"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgtype"
)

// {event_id: "", chair_id: ""}
func CreateBooking(c *fiber.Ctx) error {
	if err := types.Enforce(c); err != nil {
		return err
	}

	var err error
	sess, err := types.SessionStore.Get(c)
	if err != nil {
		return err
	}

	booking := new(database.CreateBookingParams)

	if err := c.BodyParser(booking); err != nil {
		return err
	}

	if err := booking.UserID.UnmarshalJSON(sess.Get("uid").([]byte)); err != nil {
		return err
	}

	if err := types.Validator.Validate(booking); err != nil {
		return err
	}

	var retVal database.Booking
	if retVal, err = types.DbInstance.Queries.CreateBooking(types.DbInstance.Ctx, *booking); err != nil {
		return err
	}

	agent_body := struct {
		EventId         string `json:"event_id"`
		SeatId          string `json:"seat_id"`
		UserId          string `json:"user_id"`
		BookingsCreated string `json:"bookings_created"`
		BookingsUpdated string `json:"bookings_updated"`
	}{
		EventId:         fmt.Sprintf("%x-%x-%x-%x-%x", retVal.ID.Bytes[0:4], retVal.ID.Bytes[4:6], retVal.ID.Bytes[6:8], retVal.ID.Bytes[8:10], retVal.ID.Bytes[10:16]),
		SeatId:          fmt.Sprintf("%x-%x-%x-%x-%x", retVal.ChairID.Bytes[0:4], retVal.ChairID.Bytes[4:6], retVal.ChairID.Bytes[6:8], retVal.ChairID.Bytes[8:10], retVal.ChairID.Bytes[10:16]),
		UserId:          fmt.Sprintf("%x-%x-%x-%x-%x", retVal.UserID.Bytes[0:4], retVal.UserID.Bytes[4:6], retVal.UserID.Bytes[6:8], retVal.UserID.Bytes[8:10], retVal.UserID.Bytes[10:16]),
		BookingsCreated: retVal.CreatedAt.Time.Format("2006-01-02"),
		BookingsUpdated: retVal.UpdatedAt.Time.Format("2006-01-02"),
	}

	var agent_body_string []byte
	if agent_body_string, err = json.Marshal(agent_body); err != nil {
		return err
	}

	res, err := http.Post(fmt.Sprintf("%s/api/booking", os.Getenv("TICKET_APP")), "application/json", bytes.NewReader(agent_body_string))
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != 200 && res.StatusCode != 201 {
		return &fiber.Error{
			Code:    fiber.StatusInternalServerError,
			Message: "Internal call error",
		}
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return err
	}

	return c.Status(fiber.StatusCreated).JSON(&types.ResponseTemplate{
		Success: true,
		Message: string(body),
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

	if err := param.ID.UnmarshalJSON([]byte(c.Params("id"))); err != nil {
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
		Message: "User Updated",
	})
}
