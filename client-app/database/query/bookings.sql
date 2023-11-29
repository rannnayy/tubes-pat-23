-- name: GetBookingById :one
SELECT * FROM bookings
WHERE id = $1 LIMIT 1;

-- name: GetBookingByUser :one
SELECT * FROM bookings
WHERE user_id = $1 LIMIT 1;

-- name: GetAllBookingByUser :many
SELECT * FROM bookings
WHERE user_id = $1;

-- name: CreateBookingId :one
INSERT INTO bookings (
  id, user_id, event_id, chair_id
) VALUES (
  $1, $2, $3, $4
)
RETURNING *;

-- name: CreateBookingFailed :one
INSERT INTO bookings (
  user_id, event_id, chair_id, status, pdf_url
) VALUES (
  $1, $2, $3, $4, $5
)
RETURNING *;

-- name: UpdateBookingStatus :exec
UPDATE bookings
  set status = $2,
  pdf_url = $3
WHERE id = $1;

-- name: DeleteBooking :exec
DELETE FROM bookings
WHERE id = $1;