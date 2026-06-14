CREATE TABLE IF NOT EXISTS djkj.push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL
);

ALTER TABLE djkj.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Only authenticated users (admin) can manage subscriptions
CREATE POLICY "authenticated full access" ON djkj.push_subscriptions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Service role can read subscriptions to send pushes
GRANT ALL ON djkj.push_subscriptions TO service_role;
GRANT USAGE ON SCHEMA djkj TO service_role;
