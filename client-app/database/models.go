// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.23.0

package database

import (
	"database/sql/driver"
	"fmt"

	"github.com/jackc/pgx/v5/pgtype"
)

type BookingStatus string

const (
	BookingStatusSuccess    BookingStatus = "success"
	BookingStatusFailure    BookingStatus = "failure"
	BookingStatusProcessing BookingStatus = "processing"
)

func (e *BookingStatus) Scan(src interface{}) error {
	switch s := src.(type) {
	case []byte:
		*e = BookingStatus(s)
	case string:
		*e = BookingStatus(s)
	default:
		return fmt.Errorf("unsupported scan type for BookingStatus: %T", src)
	}
	return nil
}

type NullBookingStatus struct {
	BookingStatus BookingStatus `json:"booking_status"`
	Valid         bool          `json:"valid"` // Valid is true if BookingStatus is not NULL
}

// Scan implements the Scanner interface.
func (ns *NullBookingStatus) Scan(value interface{}) error {
	if value == nil {
		ns.BookingStatus, ns.Valid = "", false
		return nil
	}
	ns.Valid = true
	return ns.BookingStatus.Scan(value)
}

// Value implements the driver Valuer interface.
func (ns NullBookingStatus) Value() (driver.Value, error) {
	if !ns.Valid {
		return nil, nil
	}
	return string(ns.BookingStatus), nil
}

type Booking struct {
	ID        pgtype.UUID      `db:"id" json:"id"`
	UserID    pgtype.UUID      `db:"user_id" json:"user_id" validate:"required"`
	EventID   pgtype.UUID      `db:"event_id" json:"event_id" validate:"required"`
	ChairID   pgtype.UUID      `db:"chair_id" json:"chair_id" validate:"required"`
	PdfUrl    pgtype.Text      `db:"pdf_url" json:"pdf_url"`
	Status    BookingStatus    `db:"status" json:"status" validate:"required,bookingstatus_custom_validation"`
	CreatedAt pgtype.Timestamp `db:"created_at" json:"created_at"`
	UpdatedAt pgtype.Timestamp `db:"updated_at" json:"updated_at"`
}

type User struct {
	ID       pgtype.UUID `db:"id" json:"id"`
	Username string      `db:"username" json:"username" validate:"required,max=32"`
	Password string      `db:"password" json:"password" validate:"required,alphanum"`
}
