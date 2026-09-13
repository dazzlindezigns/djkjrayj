ALTER TABLE djkj.bookings ADD COLUMN IF NOT EXISTS sms_opt_in boolean NOT NULL DEFAULT false;
ALTER TABLE djkj.bookings ADD COLUMN IF NOT EXISTS sms_opt_in_at timestamptz;
