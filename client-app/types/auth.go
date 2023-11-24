package types

import (
	"github.com/gofiber/fiber/v2"
)

func Enforce(c *fiber.Ctx) error {
	sess, err := SessionStore.Get(c)
	if err != nil {
		return err
	}

	if sess.Get("uid") == nil {
		return &fiber.Error{
			Code:    fiber.StatusUnauthorized,
			Message: "Unauthorized",
		}
	}

	return nil
}
