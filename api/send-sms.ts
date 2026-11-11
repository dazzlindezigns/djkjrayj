import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isSignedIn } from './_auth.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'djkj' } }
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await isSignedIn(supabase, req))) return res.status(401).json({ error: 'Unauthorized' });

  const { bookingId, to, body } = req.body ?? {};
  if (!bookingId || !to || !body) {
    return res.status(400).json({ error: 'bookingId, to, and body are required' });
  }

  const { data: booking } = await supabase.from('bookings').select('sms_opt_in').eq('id', bookingId).maybeSingle();
  if (!booking?.sms_opt_in) {
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('booking_id', bookingId)
      .eq('direction', 'inbound');
    if (!count) {
      return res.status(403).json({ error: "This client hasn't opted in to text messages." });
    }
  }

  const from = process.env.TELNYX_PHONE_NUMBER!;

  const telnyxRes = await fetch('https://api.telnyx.com/v2/messages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, text: body }),
  });

  const telnyxData = await telnyxRes.json();
  if (!telnyxRes.ok) {
    const detail = telnyxData?.errors?.[0]?.detail ?? 'Telnyx error';
    return res.status(500).json({ error: detail });
  }

  await supabase.from('messages').insert({
    booking_id: bookingId,
    direction: 'outbound',
    body,
    from_number: from,
    to_number: to,
    telnyx_message_id: telnyxData.data?.id,
    status: 'sent',
  });

  res.json({ success: true });
}
