package types

import (
	"fmt"
	"reflect"
	"strings"

	"clientapp/database"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

type (
	errorResponse struct {
		Error       bool
		FailedField string
		Tag         string
		Value       interface{}
	}

	CustomValidator struct {
		validator *validator.Validate
	}
)

func ValidatorInit() {
	Validator.validator = validator.New()

	Validator.validator.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "-" {
			return ""
		}
		return name
	})

	err := Validator.validator.RegisterValidation("bookingstatus_custom_validation", func(fl validator.FieldLevel) bool {
		value := fl.Field().Interface().(database.BookingStatus)
		return value == database.BookingStatusProcessing || value == database.BookingStatusSuccess || value == database.BookingStatusFailure
	})
	if err != nil {
		fmt.Println(err)
		return
	}
}

func (v CustomValidator) validate(data interface{}) []errorResponse {
	validationErrors := []errorResponse{}

	errs := v.validator.Struct(data)
	if errs != nil {
		for _, err := range errs.(validator.ValidationErrors) {
			// In this case data object is actually holding the User struct
			var elem errorResponse

			elem.FailedField = err.Field() // Export struct field name
			elem.Tag = err.Tag()           // Export struct tag
			elem.Value = err.Value()       // Export field value
			elem.Error = true

			validationErrors = append(validationErrors, elem)
		}
	}

	return validationErrors
}

func (v CustomValidator) Validate(data interface{}) error {
	if errs := v.validate(data); len(errs) > 0 && errs[0].Error {
		errMsgs := make([]string, 0)

		for _, err := range errs {
			errMsgs = append(errMsgs, fmt.Sprintf(
				"[%s]: '%v' | Needs to implement '%s'",
				err.FailedField,
				err.Value,
				err.Tag,
			))
		}

		return &fiber.Error{
			Code:    fiber.ErrBadRequest.Code,
			Message: strings.Join(errMsgs, " and "),
		}
	}
	return nil
}

var Validator CustomValidator
