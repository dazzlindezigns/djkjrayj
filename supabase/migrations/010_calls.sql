CREATE TABLE IF NOT EXISTS djkj.calls (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status text NOT NULL DEFAULT 'ringing',
  client_number text NOT NULL,
  client_id uuid REFERENCES djkj.clients(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES djkj.bookings(id) ON DELETE SET NULL,
  caller_name text,
  duration_seconds integer,
  telnyx_call_sid text,
  dismissed boolean NOT NULL DEFAULT false
);

ALTER TABLE djkj.calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY calls_auth_all ON djkj.calls FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY calls_service_all ON djkj.calls FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON djkj.calls TO authenticated;
GRANT ALL ON djkj.calls TO service_role;

CREATE INDEX IF NOT EXISTS calls_created_at_idx ON djkj.calls(created_at DESC);
CREATE INDEX IF NOT EXISTS calls_booking_id_idx ON djkj.calls(booking_id);
CREATE INDEX IF NOT EXISTS calls_telnyx_call_sid_idx ON djkj.calls(telnyx_call_sid);
