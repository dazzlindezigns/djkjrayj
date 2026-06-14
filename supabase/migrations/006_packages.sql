CREATE TABLE IF NOT EXISTS djkj.packages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  sort_order integer NOT NULL DEFAULT 0,
  name text NOT NULL,
  price integer NOT NULL DEFAULT 0,
  duration text NOT NULL DEFAULT '2 hours',
  tagline text NOT NULL DEFAULT '',
  popular boolean NOT NULL DEFAULT false,
  inclusions text[] NOT NULL DEFAULT '{}'
);

ALTER TABLE djkj.packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY packages_anon_read ON djkj.packages FOR SELECT TO anon USING (true);
CREATE POLICY packages_auth_all ON djkj.packages FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT ON djkj.packages TO anon;
GRANT ALL ON djkj.packages TO authenticated;
GRANT ALL ON djkj.packages TO service_role;

INSERT INTO djkj.packages (sort_order, name, price, duration, tagline, popular, inclusions) VALUES
(1, 'Starter Set', 15000, '2 hours', 'Perfect for small gatherings', false, ARRAY[
  '2 hours of live DJ performance',
  'Professional speakers & subwoofer',
  'Music customization — you pick the vibe',
  'Wireless mic for announcements',
  'Basic LED lighting',
  'Live song request handling',
  'Setup & teardown included'
]),
(2, 'The Vibe', 27500, '3 hours', 'Great for parties', true, ARRAY[
  '3 hours of live DJ performance',
  'Professional speakers & powered subwoofer',
  'Full music customization with playlist coordination',
  'Wireless mic for announcements & hype',
  'Enhanced LED lighting package',
  'Live song requests & crowd reading',
  'Venue walkthrough before event',
  'Setup & teardown included'
]),
(3, 'Full Send', 40000, '4+ hours', 'Full event coverage', false, ARRAY[
  '4+ hours of live DJ performance',
  'Premium dual speakers & powered subwoofer',
  'Full event music direction — start to finish',
  'Wireless mic for announcements, toasts & hype',
  'Full LED + moving light show',
  'Live song requests & crowd reading',
  'Coordination with your event timeline',
  'Priority booking & dedicated planning call',
  'Setup & teardown included'
]);
