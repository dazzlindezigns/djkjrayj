import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'djkj' } }
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    name,
    email,
    phone,
    event_type,
    event_date,
    venue,
    guest_count,
    package_preference,
    start_time,
    music_notes,
    special_requests,
  } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'Name, email, and phone are required' });
  }

  // 1. Create or find client
  let clientId: string;

  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingClient) {
    clientId = existingClient.id;
  } else {
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({ name, email, phone })
      .select('id')
      .single();

    if (clientError || !newClient) {
      return res.status(500).json({ error: 'Failed to create client: ' + (clientError?.message ?? 'unknown') });
    }
    clientId = newClient.id;
  }

  // 2. Build internal_notes from music_notes + special_requests
  const noteParts: string[] = [];
  if (music_notes) noteParts.push(`Music/Vibe Notes: ${music_notes}`);
  if (special_requests) noteParts.push(`Special Requests: ${special_requests}`);
  const internal_notes = noteParts.join('\n\n') || null;

  // 3. Create booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      client_id: clientId,
      status: 'inquiry_submitted',
      event_type: event_type || null,
      event_date: event_date || null,
      venue: venue || null,
      guest_count: guest_count || null,
      package_name: package_preference || null,
      start_time: start_time || null,
      internal_notes,
    })
    .select('id')
    .single();

  if (bookingError || !booking) {
    return res.status(500).json({ error: 'Failed to create booking: ' + (bookingError?.message ?? 'unknown') });
  }

  // 4. Fire notification email (best-effort — don't fail the response if this errors)
  try {
    const appUrl = process.env.VITE_APP_URL || '';
    await fetch(`${appUrl}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'inquiry_notify', booking_id: booking.id }),
    });
  } catch (_err) {
    // non-fatal
  }

  return res.status(200).json({ success: true, bookingId: booking.id });
}
