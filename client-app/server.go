package main

import (
	"clientapp/handlers"
	"clientapp/types"
	"errors"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println(".env file not found. Fallback to os env")
	}

	conn, err := types.DbInit()
	if err != nil {
		log.Fatalln("Db connection error")
	}
	defer conn.Close(types.DbInstance.Ctx)

	types.SessionInit()
	types.ValidatorInit()
	types.HashParamInit()

	app := fiber.New(fiber.Config{
		// Global custom error handler
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			// Status code defaults to 500
			code := fiber.StatusInternalServerError

			// Retrieve the custom status code if it's a *fiber.Error
			var e *fiber.Error
			if errors.As(err, &e) {
				code = e.Code
			}

			return c.Status(code).JSON(types.ResponseTemplate{
				Success: false,
				Message: err.Error(),
			})
		},
	})

	app.Use(recover.New())

	api := app.Group("/api")

	users := api.Group("/users")
	users.Post("/register", handlers.RegisterUser)        // {username: "", password: ""}
	users.Post("/login", handlers.LoginUser)              // {username: "", password: ""}
	users.Patch("/password", handlers.UpdateUserPassword) // {password: ""}
	users.Delete("/selfdestruct", handlers.DeleteUser)    //

	bookings := api.Group("/bookings")
	bookings.Post("/", handlers.CreateBooking)           // {event_id: "", chair_id: ""}
	bookings.Get("/", handlers.GetAllBooking)            //
	bookings.Patch("/:id", handlers.UpdateBookingStatus) // {status: ""}

	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("Hello, World!")
	})

	app.Listen(":3000")
}
