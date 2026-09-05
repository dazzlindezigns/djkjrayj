import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'djkj' } }
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { data } = req.body ?? {};
  if (!data) return res.status(400).end();

  const eventType: string = data.event_type ?? '';

  if (eventType === 'message.received') {
    const payload = data.payload;
    const fromNumber: string = payload?.from?.phone_number ?? '';
    const toNumber: string = payload?.to?.[0]?.phone_number ?? '';
    const body: string = payload?.text ?? '';

    if (!fromNumber || !body) return res.status(200).json({ received: true });

    // Normalize phone: strip non-digits for matching
    const normalize = (n: string) => n.replace(/\D/g, '');
    const fromNorm = normalize(fromNumber);

    // Find the most recent active booking whose client has this phone
    const { data: clients } = await supabase
      .from('clients')
      .select('id, phone')
      .limit(200);

    const matched = (clients ?? []).find(
      (c: { id: string; phone: string | null }) => c.phone && normalize(c.phone) === fromNorm
    );

    if (matched) {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('client_id', matched.id)
        .not('status', 'in', '("cancelled","completed")')
        .order('created_at', { ascending: false })
        .limit(1);

      if (bookings && bookings.length > 0) {
        await supabase.from('messages').insert({
          booking_id: bookings[0].id,
          direction: 'inbound',
          body,
          from_number: fromNumber,
          to_number: toNumber,
          telnyx_message_id: payload?.id,
          status: 'received',
        });

        // Push notification
        const appUrl = process.env.VITE_APP_URL ?? '';
        await fetch(`${appUrl}/api/send-push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: '💬 New Message',
            body: `${fromNumber}: ${body.substring(0, 80)}`,
          }),
        }).catch(() => {});
      }
    }
  }

  // Call events — just acknowledge for now; WebRTC handles the media
  res.status(200).json({ received: true });
}
