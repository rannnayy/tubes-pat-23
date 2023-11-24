-- name: GetBookingById :one
SELECT * FROM bookings
WHERE id = $1 LIMIT 1;

-- name: GetBookingByUser :one
SELECT * FROM bookings
WHERE user_id = $1 LIMIT 1;

-- name: GetAllBookingByUser :many
SELECT * FROM bookings
WHERE user_id = $1;

-- name: CreateBooking :one
INSERT INTO bookings (
  user_id, event_id, chair_id
) VALUES (
  $1, $2, $3
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