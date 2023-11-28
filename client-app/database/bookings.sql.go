// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.23.0
// source: bookings.sql

package database

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
)

const createBooking = `-- name: CreateBooking :one
INSERT INTO bookings (
  user_id, event_id, chair_id
) VALUES (
  $1, $2, $3
)
RETURNING id, user_id, event_id, chair_id, pdf_url, status, created_at, updated_at
`

type CreateBookingParams struct {
	UserID  pgtype.UUID `db:"user_id" json:"user_id" validate:"required"`
	EventID pgtype.UUID `db:"event_id" json:"event_id" validate:"required"`
	ChairID pgtype.UUID `db:"chair_id" json:"chair_id" validate:"required"`
}

func (q *Queries) CreateBooking(ctx context.Context, arg CreateBookingParams) (Booking, error) {
	row := q.db.QueryRow(ctx, createBooking, arg.UserID, arg.EventID, arg.ChairID)
	var i Booking
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.EventID,
		&i.ChairID,
		&i.PdfUrl,
		&i.Status,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const deleteBooking = `-- name: DeleteBooking :exec
DELETE FROM bookings
WHERE id = $1
`

func (q *Queries) DeleteBooking(ctx context.Context, id pgtype.UUID) error {
	_, err := q.db.Exec(ctx, deleteBooking, id)
	return err
}

const getAllBookingByUser = `-- name: GetAllBookingByUser :many
SELECT id, user_id, event_id, chair_id, pdf_url, status, created_at, updated_at FROM bookings
WHERE user_id = $1
`

func (q *Queries) GetAllBookingByUser(ctx context.Context, userID pgtype.UUID) ([]Booking, error) {
	rows, err := q.db.Query(ctx, getAllBookingByUser, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Booking
	for rows.Next() {
		var i Booking
		if err := rows.Scan(
			&i.ID,
			&i.UserID,
			&i.EventID,
			&i.ChairID,
			&i.PdfUrl,
			&i.Status,
			&i.CreatedAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getBookingById = `-- name: GetBookingById :one
SELECT id, user_id, event_id, chair_id, pdf_url, status, created_at, updated_at FROM bookings
WHERE id = $1 LIMIT 1
`

func (q *Queries) GetBookingById(ctx context.Context, id pgtype.UUID) (Booking, error) {
	row := q.db.QueryRow(ctx, getBookingById, id)
	var i Booking
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.EventID,
		&i.ChairID,
		&i.PdfUrl,
		&i.Status,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getBookingByUser = `-- name: GetBookingByUser :one
SELECT id, user_id, event_id, chair_id, pdf_url, status, created_at, updated_at FROM bookings
WHERE user_id = $1 LIMIT 1
`

func (q *Queries) GetBookingByUser(ctx context.Context, userID pgtype.UUID) (Booking, error) {
	row := q.db.QueryRow(ctx, getBookingByUser, userID)
	var i Booking
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.EventID,
		&i.ChairID,
		&i.PdfUrl,
		&i.Status,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const updateBookingStatus = `-- name: UpdateBookingStatus :exec
UPDATE bookings
  set status = $2,
  pdf_url = $3
WHERE id = $1
`

type UpdateBookingStatusParams struct {
	ID     pgtype.UUID   `db:"id" json:"id"`
	Status BookingStatus `db:"status" json:"status" validate:"required,bookingstatus_custom_validation"`
	PdfUrl pgtype.Text   `db:"pdf_url" json:"pdf_url"`
}

func (q *Queries) UpdateBookingStatus(ctx context.Context, arg UpdateBookingStatusParams) error {
	_, err := q.db.Exec(ctx, updateBookingStatus, arg.ID, arg.Status, arg.PdfUrl)
	return err
}
