import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'djkj' } }
);

webpush.setVapidDetails(
  'mailto:bookings@djkjatx.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { title, body, url } = req.body ?? {};
  if (!title) return res.status(400).json({ error: 'title is required' });

  const { data: subs, error } = await supabase.from('push_subscriptions').select('*');
  if (error) return res.status(500).json({ error: error.message });
  if (!subs?.length) return res.status(200).json({ success: true, sent: 0 });

  const payload = JSON.stringify({ title, body: body ?? '', url: url ?? '/dashboard' });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      ).catch(async (err) => {
        // Remove stale subscriptions (410 Gone)
        if (err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
        throw err;
      })
    )
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  return res.status(200).json({ success: true, sent });
}
