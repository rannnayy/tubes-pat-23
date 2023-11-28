package handlers

import (
	"clientapp/database"
	"clientapp/types"
	"encoding/json"
	"fmt"
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
		BookingsCreated: retVal.CreatedAt.Time.Format("2006-01-02"),
		BookingsUpdated: retVal.UpdatedAt.Time.Format("2006-01-02"),
	}

	var temp []byte
	if temp, err = retVal.ID.MarshalJSON(); err != nil {
		return err
	}
	agent_body.EventId = string(temp)

	if temp, err = retVal.ChairID.MarshalJSON(); err != nil {
		return err
	}
	agent_body.SeatId = string(temp)

	if temp, err = retVal.UserID.MarshalJSON(); err != nil {
		return err
	}
	agent_body.UserId = string(temp)

	var agent_body_string []byte
	if agent_body_string, err = json.Marshal(agent_body); err != nil {
		return err
	}

	agent := fiber.Post(fmt.Sprintf("%s/api/booking", os.Getenv("TICKET_APP")))
	agent.Body(agent_body_string) // set body received by request
	statusCode, body, _ := agent.Bytes()
	if statusCode != 200 && statusCode != 201 {
		return &fiber.Error{
			Code:    fiber.StatusInternalServerError,
			Message: "Internal call error",
		}
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
