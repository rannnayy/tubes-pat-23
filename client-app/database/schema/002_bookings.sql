CREATE TYPE booking_status AS ENUM ('success', 'failure', 'processing');

CREATE TABLE bookings (
  id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID            NOT NULL REFERENCES users(id),
  event_id      UUID            NOT NULL,
  chair_id      UUID            NOT NULL,
  pdf_url       TEXT,
  status        booking_status  NOT NULL DEFAULT 'processing',
  created_at    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP     
);

CREATE  FUNCTION update_booking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_booking
  BEFORE UPDATE
  ON
    bookings
  FOR EACH ROW
EXECUTE PROCEDURE update_booking_timestamp();

---- create above / drop below ----

DROP TRIGGER update_booking ON bookings;
DROP FUNCTION update_booking_timestamp();
DROP TABLE bookings;
DROP TYPE booking_status;