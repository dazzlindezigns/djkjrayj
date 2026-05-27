-- Add discount_amount column to bookings (stored in cents, default 0)
ALTER TABLE djkj.bookings
  ADD COLUMN IF NOT EXISTS discount_amount_off integer NOT NULL DEFAULT 0;
