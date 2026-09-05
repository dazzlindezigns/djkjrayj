CREATE TABLE IF NOT EXISTS djkj.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  booking_id uuid REFERENCES djkj.bookings(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body text NOT NULL,
  from_number text NOT NULL,
  to_number text NOT NULL,
  telnyx_message_id text,
  status text NOT NULL DEFAULT 'sent'
);

ALTER TABLE djkj.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_auth_all ON djkj.messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY messages_service_all ON djkj.messages FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT ALL ON djkj.messages TO authenticated;
GRANT ALL ON djkj.messages TO service_role;

CREATE INDEX messages_booking_id_idx ON djkj.messages(booking_id);
CREATE INDEX messages_from_number_idx ON djkj.messages(from_number);
