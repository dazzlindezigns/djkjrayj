-- Add custom_terms field to bookings for admin-editable contract addendum
ALTER TABLE djkj.bookings
  ADD COLUMN IF NOT EXISTS custom_terms text;
