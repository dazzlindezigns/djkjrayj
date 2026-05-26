import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  type: string;
  booking_id: string;
  attachment_base64?: string;
}

interface BookingRow {
  id: string;
  status: string;
  event_date: string | null;
  event_type: string | null;
  venue: string | null;
  guest_count: number | null;
  start_time: string | null;
  hours: number | null;
  total_price: number | null;
  deposit_amount: number | null;
  package_name: string | null;
  signed_at: string | null;
  client_signature: string | null;
  internal_notes: string | null;
  inquiry_token: string;
  clients: {
    id: string;
    name: string;
    email: string;
    phone: string;
    notes: string | null;
  } | null;
}

function formatCents(cents: number | null): string {
  if (cents == null) return 'TBD';
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'TBD';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function baseEmailHtml(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DJ KJ Bookings</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0a0a0f; font-family: Arial, sans-serif; color: #ffffff; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 24px; }
    .header { text-align: center; margin-bottom: 32px; }
    .logo { font-size: 32px; font-weight: 900; background: linear-gradient(135deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: 2px; }
    .subtitle { color: rgba(255,255,255,0.4); font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin-top: 4px; }
    .card { background: #12121a; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 28px; margin-bottom: 20px; }
    .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.35); margin-bottom: 16px; }
    .field { margin-bottom: 12px; }
    .field-label { font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
    .field-value { font-size: 15px; font-weight: 600; color: #ffffff; }
    .divider { height: 1px; background: rgba(255,255,255,0.08); margin: 16px 0; }
    .btn { display: inline-block; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 15px; text-decoration: none; text-align: center; }
    .btn-primary { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: #ffffff; }
    .btn-green { background: linear-gradient(135deg, #22c55e, #16a34a); color: #ffffff; }
    .btn-cashapp { background: #00c805; color: #000000; }
    .highlight-green { color: #22c55e; font-weight: 700; }
    .highlight-yellow { color: #eab308; font-weight: 700; }
    .highlight-blue { color: #3b82f6; font-weight: 700; }
    .footer { text-align: center; color: rgba(255,255,255,0.2); font-size: 12px; margin-top: 32px; }
    h2 { font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0; }
    p { font-size: 15px; color: rgba(255,255,255,0.65); line-height: 1.6; margin: 0 0 12px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">DJ KJ</div>
      <div class="subtitle">Booking Manager · Pflugerville, TX</div>
    </div>
    ${content}
    <div class="footer">
      DJ KJ Bookings · Pflugerville, TX · CashApp: $Kjwasington37<br/>
      <span style="color: rgba(255,255,255,0.1);">This is an automated email from DJ KJ Bookings.</span>
    </div>
  </div>
</body>
</html>`;
}

function buildEmailContent(
  type: string,
  booking: BookingRow,
  appUrl: string
): { subject: string; html: string; to: string } {
  const client = booking.clients;
  const clientName = client?.name ?? 'Client';
  const clientEmail = client?.email ?? '';
  const husbandEmail = Deno.env.get('HUSBAND_EMAIL') ?? 'dazzlindezigns@gmail.com';
  const inquiryUrl = `${appUrl}/book/${booking.inquiry_token}`;
  const signingUrl = `${appUrl}/sign/${booking.id}`;

  switch (type) {
    case 'inquiry_invite': {
      return {
        to: clientEmail,
        subject: `DJ KJ — Let's Get Your Booking Started! 🎧`,
        html: baseEmailHtml(`
          <div class="card">
            <h2>Hey ${clientName}! 👋</h2>
            <p>DJ KJ is excited to potentially be part of your event! Fill out the short form below to get your booking rolling.</p>
            <p>It only takes about 2 minutes and helps DJ KJ make sure everything is perfect for your event.</p>
            <div class="divider"></div>
            <div style="text-align: center; margin-top: 24px;">
              <a href="${inquiryUrl}" class="btn btn-primary" style="display: inline-block;">
                Fill Out Booking Form →
              </a>
            </div>
            <p style="text-align: center; margin-top: 16px; font-size: 13px; color: rgba(255,255,255,0.3);">
              Or copy this link: ${inquiryUrl}
            </p>
          </div>
          <div class="card">
            <div class="card-title">What Happens Next?</div>
            <div class="field">
              <div class="field-value">1. Fill out the form with your event details</div>
            </div>
            <div class="field">
              <div class="field-value">2. DJ KJ reviews and confirms availability</div>
            </div>
            <div class="field">
              <div class="field-value">3. You'll receive a booking agreement to sign</div>
            </div>
            <div class="field">
              <div class="field-value">4. Pay your deposit to lock in your date 🔒</div>
            </div>
          </div>
        `),
      };
    }

    case 'inquiry_notify': {
      return {
        to: husbandEmail,
        subject: `New Booking Inquiry: ${clientName} — ${booking.event_type ?? 'Event'}`,
        html: baseEmailHtml(`
          <div class="card">
            <div class="card-title">New Booking Inquiry Submitted</div>
            <h2>${clientName}</h2>
            <div class="field">
              <div class="field-label">Email</div>
              <div class="field-value">${client?.email ?? '—'}</div>
            </div>
            <div class="field">
              <div class="field-label">Phone</div>
              <div class="field-value">${client?.phone ?? '—'}</div>
            </div>
            <div class="divider"></div>
            <div class="field">
              <div class="field-label">Event Type</div>
              <div class="field-value">${booking.event_type ?? '—'}</div>
            </div>
            <div class="field">
              <div class="field-label">Event Date</div>
              <div class="field-value">${formatDate(booking.event_date)}</div>
            </div>
            <div class="field">
              <div class="field-label">Venue</div>
              <div class="field-value">${booking.venue ?? '—'}</div>
            </div>
            <div class="field">
              <div class="field-label">Guest Count</div>
              <div class="field-value">${booking.guest_count ?? '—'}</div>
            </div>
            <div class="field">
              <div class="field-label">Package Preference</div>
              <div class="field-value">${booking.package_name ?? 'No Preference'}</div>
            </div>
            ${booking.internal_notes ? `
            <div class="divider"></div>
            <div class="field">
              <div class="field-label">Notes from Client</div>
              <div class="field-value" style="white-space: pre-wrap;">${booking.internal_notes}</div>
            </div>
            ` : ''}
          </div>
          <div style="text-align: center; margin-top: 24px;">
            <a href="${appUrl}/dashboard/booking/${booking.id}" class="btn btn-primary" style="display: inline-block;">
              View in Dashboard →
            </a>
          </div>
        `),
      };
    }

    case 'agreement': {
      return {
        to: clientEmail,
        subject: `DJ KJ — Your Booking Agreement is Ready to Sign ✍️`,
        html: baseEmailHtml(`
          <div class="card">
            <h2>Your Booking is Confirmed! 🎉</h2>
            <p>Great news, ${clientName}! DJ KJ has confirmed your booking. Your agreement is ready to review and sign.</p>
            <div class="divider"></div>
            <div class="field">
              <div class="field-label">Event Date</div>
              <div class="field-value">${formatDate(booking.event_date)}</div>
            </div>
            <div class="field">
              <div class="field-label">Event Type</div>
              <div class="field-value">${booking.event_type ?? '—'}</div>
            </div>
            ${booking.venue ? `
            <div class="field">
              <div class="field-label">Venue</div>
              <div class="field-value">${booking.venue}</div>
            </div>
            ` : ''}
            ${booking.package_name ? `
            <div class="field">
              <div class="field-label">Package</div>
              <div class="field-value">${booking.package_name}</div>
            </div>
            ` : ''}
            <div class="divider"></div>
            <div class="field">
              <div class="field-label">Total Price</div>
              <div class="field-value highlight-green">${formatCents(booking.total_price)}</div>
            </div>
            <div class="field">
              <div class="field-label">Deposit Due Now</div>
              <div class="field-value highlight-yellow">${formatCents(booking.deposit_amount)}</div>
            </div>
          </div>
          <div class="card">
            <p>Sign your agreement to lock in your date. After signing, you'll be directed to pay your deposit via CashApp.</p>
            <div style="text-align: center; margin-top: 20px;">
              <a href="${signingUrl}" class="btn btn-green" style="display: inline-block;">
                Review & Sign Agreement →
              </a>
            </div>
          </div>
        `),
      };
    }

    case 'contract': {
      return {
        to: clientEmail,
        subject: `DJ KJ — Signed Agreement & Booking Confirmation`,
        html: baseEmailHtml(`
          <div class="card">
            <h2>Agreement Signed! ✅</h2>
            <p>Thanks ${clientName}! Your signed booking agreement is attached to this email for your records.</p>
            <div class="divider"></div>
            <div class="field">
              <div class="field-label">Event Date</div>
              <div class="field-value">${formatDate(booking.event_date)}</div>
            </div>
            <div class="field">
              <div class="field-label">Event Type</div>
              <div class="field-value">${booking.event_type ?? '—'}</div>
            </div>
            <div class="field">
              <div class="field-label">Total Price</div>
              <div class="field-value highlight-green">${formatCents(booking.total_price)}</div>
            </div>
            <div class="field">
              <div class="field-label">Deposit Due</div>
              <div class="field-value highlight-yellow">${formatCents(booking.deposit_amount)}</div>
            </div>
          </div>
          <div class="card" style="background: rgba(0,200,5,0.05); border-color: rgba(0,200,5,0.2);">
            <div class="card-title">Pay Your Deposit via CashApp</div>
            <p>Send your deposit of <strong class="highlight-yellow">${formatCents(booking.deposit_amount)}</strong> to lock in your date!</p>
            <div style="text-align: center; margin-top: 20px;">
              <a href="https://cash.app/$Kjwasington37" class="btn btn-cashapp" style="display: inline-block;">
                Pay on CashApp — $Kjwasington37
              </a>
            </div>
            <p style="text-align: center; font-size: 13px; margin-top: 12px; color: rgba(255,255,255,0.4);">
              Screenshot your payment and text or DM DJ KJ to confirm!
            </p>
          </div>
        `),
      };
    }

    case 'confirmed': {
      return {
        to: clientEmail,
        subject: `DJ KJ — Your Event is Locked In! 🔒`,
        html: baseEmailHtml(`
          <div class="card">
            <h2>Your Date is Locked! 🔒🎉</h2>
            <p>Amazing, ${clientName}! DJ KJ received your deposit and your event is officially on the books!</p>
            <div class="divider"></div>
            <div class="field">
              <div class="field-label">Event Date</div>
              <div class="field-value">${formatDate(booking.event_date)}</div>
            </div>
            <div class="field">
              <div class="field-label">Event Type</div>
              <div class="field-value">${booking.event_type ?? '—'}</div>
            </div>
            ${booking.venue ? `
            <div class="field">
              <div class="field-label">Venue</div>
              <div class="field-value">${booking.venue}</div>
            </div>
            ` : ''}
            <div class="field">
              <div class="field-label">Remaining Balance Due</div>
              <div class="field-value highlight-yellow">${
                booking.total_price != null && booking.deposit_amount != null
                  ? formatCents(booking.total_price - booking.deposit_amount)
                  : 'TBD'
              } (due day of event)</div>
            </div>
          </div>
          <p style="text-align: center;">Can't wait to get the party started! 🎧</p>
        `),
      };
    }

    default:
      throw new Error(`Unknown email type: ${type}`);
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as EmailRequest;
    const { type, booking_id, attachment_base64 } = body;

    if (!type || !booking_id) {
      return new Response(JSON.stringify({ error: 'Missing type or booking_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const resendKey = Deno.env.get('RESEND_API_KEY') ?? '';
    const appUrl = Deno.env.get('APP_URL') ?? 'https://djkj.app';

    const supabase = createClient(supabaseUrl, serviceKey, {
      db: { schema: 'djkj' },
    });

    // Fetch booking with client
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .select('*, clients(*)')
      .eq('id', booking_id)
      .single();

    if (bookingError || !bookingData) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const booking = bookingData as BookingRow;
    const emailContent = buildEmailContent(type, booking, appUrl);

    const fromAddress = 'DJ KJ Bookings <bookings@djkj.com>';
    const fromFallback = 'DJ KJ Bookings <onboarding@resend.dev>';

    // Build Resend payload
    const resendPayload: Record<string, unknown> = {
      from: resendKey ? fromAddress : fromFallback,
      to: [emailContent.to],
      subject: emailContent.subject,
      html: emailContent.html,
    };

    // For contract email, also CC the husband
    if (type === 'contract') {
      const husbandEmail = Deno.env.get('HUSBAND_EMAIL') ?? 'dazzlindezigns@gmail.com';
      resendPayload.cc = [husbandEmail];
    }

    // Handle attachment for contract
    if (attachment_base64 && type === 'contract') {
      resendPayload.attachments = [
        {
          filename: 'DJ_KJ_Booking_Agreement.pdf',
          content: attachment_base64,
        },
      ];
    }

    // Send via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    });

    const resendData = await resendRes.json() as { id?: string; error?: string };

    // Log to email_log
    await supabase.from('email_log').insert({
      booking_id,
      type,
      to_email: emailContent.to,
      resend_id: resendData.id ?? null,
      status: resendRes.ok ? 'sent' : 'failed',
    });

    if (!resendRes.ok) {
      console.error('Resend error:', resendData);
      return new Response(JSON.stringify({ error: 'Email send failed', details: resendData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-email error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
