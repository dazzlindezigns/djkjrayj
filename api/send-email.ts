import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'djkj' } }
);

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.VITE_APP_URL || '';
const HUSBAND_EMAIL = 'brandon.washingtonjr09@gmail.com';
const HUSBAND_CC = 'brandon.washington62@gmail.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, booking_id, attachment_base64 } = req.body;

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*, clients(*)')
    .eq('id', booking_id)
    .single();

  if (error || !booking) return res.status(404).json({ error: 'Booking not found' });

  const client = booking.clients as { name: string; email: string; phone: string };
  const totalDollars = booking.total_price ? (booking.total_price / 100).toFixed(2) : '0.00';
  const depositDollars = booking.deposit_amount ? (booking.deposit_amount / 100).toFixed(2) : '0.00';
  const balanceDollars = booking.total_price && booking.deposit_amount
    ? ((booking.total_price - booking.deposit_amount) / 100).toFixed(2)
    : '0.00';

  const eventDate = booking.event_date
    ? new Date(booking.event_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'TBD';

  // Calculate end time from start_time + hours
  let endTime = '';
  if (booking.start_time && booking.hours) {
    const [h, m] = booking.start_time.split(':').map(Number);
    const end = new Date(2000, 0, 1, h + booking.hours, m);
    endTime = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  const startTimeFormatted = booking.start_time
    ? new Date(`2000-01-01T${booking.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : 'TBD';

  const btnStyle = 'display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;margin:16px 0;';
  const wrapStyle = 'font-family:Arial,sans-serif;background:#0a0a0f;color:#ffffff;max-width:560px;margin:0 auto;padding:32px 24px;border-radius:16px;';
  const mutedStyle = 'color:rgba(255,255,255,0.5);font-size:13px;';
  const labelStyle = 'color:rgba(255,255,255,0.6);font-size:13px;';
  const valStyle = 'color:#fff;font-size:14px;font-weight:600;';

  type EmailPayload = {
    from: string;
    to: string | string[];
    subject: string;
    html: string;
    attachments?: Array<{ filename: string; content: string }>;
  };

  let payload: EmailPayload | null = null;

  if (type === 'inquiry_invite') {
    payload = {
      from: 'DJ KJ Bookings <bookings@djkjatx.com>',
      to: client.email,
      subject: 'Complete Your Booking with DJ KJ 🎧',
      html: `<div style="${wrapStyle}">
        <h1 style="font-size:28px;margin:0 0 4px;">DJ KJ</h1>
        <p style="${mutedStyle}margin-top:0;">Booking Request</p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:20px 0;">
        <p>Hey <strong>${client.name}</strong>!</p>
        <p>DJ KJ is excited to potentially DJ your event. Complete your booking details using the link below:</p>
        <a href="${APP_URL}/book/${booking.inquiry_token}" style="${btnStyle}">Complete My Booking →</a>
        <p>This link is unique to you. Once submitted, we'll reach out with next steps and your booking agreement.</p>
        <p style="${mutedStyle}">Questions? Reply to this email.</p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:20px 0;">
        <p style="${mutedStyle}">— DJ KJ Team</p>
      </div>`,
    };
  } else if (type === 'inquiry_notify') {
    payload = {
      from: 'DJ KJ Bookings <bookings@djkjatx.com>',
      to: HUSBAND_EMAIL,
      cc: HUSBAND_CC,
      subject: `New Booking Inquiry — ${client.name}`,
      html: `<div style="${wrapStyle}">
        <h1 style="font-size:24px;margin:0 0 4px;">New Booking Inquiry</h1>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:20px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="${labelStyle}padding:6px 0;">Client</td><td style="${valStyle}padding:6px 0;">${client.name}</td></tr>
          <tr><td style="${labelStyle}padding:6px 0;">Email</td><td style="${valStyle}padding:6px 0;">${client.email}</td></tr>
          <tr><td style="${labelStyle}padding:6px 0;">Phone</td><td style="${valStyle}padding:6px 0;">${client.phone}</td></tr>
          ${booking.event_type ? `<tr><td style="${labelStyle}padding:6px 0;">Event</td><td style="${valStyle}padding:6px 0;">${booking.event_type}</td></tr>` : ''}
          ${booking.event_date ? `<tr><td style="${labelStyle}padding:6px 0;">Date</td><td style="${valStyle}padding:6px 0;">${eventDate}</td></tr>` : ''}
        </table>
        <a href="${APP_URL}/dashboard/booking/${booking.id}" style="${btnStyle}">View in Dashboard →</a>
        <p style="${mutedStyle}">Log in to review and confirm the booking details.</p>
      </div>`,
    };
  } else if (type === 'agreement') {
    payload = {
      from: 'DJ KJ Bookings <bookings@djkjatx.com>',
      to: client.email,
      subject: 'Your DJ KJ Booking Agreement is Ready to Sign',
      html: `<div style="${wrapStyle}">
        <h1 style="font-size:28px;margin:0 0 4px;">DJ KJ</h1>
        <p style="${mutedStyle}margin-top:0;">Booking Agreement Ready</p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:20px 0;">
        <p>Hey <strong>${client.name}</strong>!</p>
        <p>Your booking details are confirmed. Please review and sign your agreement to officially lock in your date:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="${labelStyle}padding:6px 0;">Event</td><td style="${valStyle}padding:6px 0;">${booking.event_type || 'TBD'}</td></tr>
          <tr><td style="${labelStyle}padding:6px 0;">Date</td><td style="${valStyle}padding:6px 0;">${eventDate}</td></tr>
          <tr><td style="${labelStyle}padding:6px 0;">Total</td><td style="${valStyle}padding:6px 0;">$${totalDollars}</td></tr>
          <tr><td style="${labelStyle}padding:6px 0;">Deposit Due</td><td style="${valStyle}padding:6px 0;">$${depositDollars}</td></tr>
        </table>
        <a href="${APP_URL}/sign/${booking.id}" style="${btnStyle}">Sign My Agreement →</a>
        <p style="${mutedStyle}">Once signed, you'll receive a copy of the agreement and instructions for submitting your deposit via CashApp.</p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:20px 0;">
        <p style="${mutedStyle}">— DJ KJ Team</p>
      </div>`,
    };
  } else if (type === 'contract') {
    const attachments = attachment_base64
      ? [{ filename: `DJ-KJ-Agreement-${client.name.replace(/\s+/g, '-')}.pdf`, content: attachment_base64 }]
      : [];
    const contractHtml = `<div style="${wrapStyle}">
      <h1 style="font-size:24px;margin:0 0 4px;">Booking Agreement Signed</h1>
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:20px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="${labelStyle}padding:6px 0;">Client</td><td style="${valStyle}padding:6px 0;">${client.name}</td></tr>
        <tr><td style="${labelStyle}padding:6px 0;">Event</td><td style="${valStyle}padding:6px 0;">${booking.event_type || 'TBD'} on ${eventDate}</td></tr>
        <tr><td style="${labelStyle}padding:6px 0;">Total</td><td style="${valStyle}padding:6px 0;">$${totalDollars}</td></tr>
        <tr><td style="${labelStyle}padding:6px 0;">Deposit</td><td style="${valStyle}padding:6px 0;">$${depositDollars}</td></tr>
      </table>
      <p>A copy of the signed agreement is attached.</p>
      <p style="${mutedStyle}">— DJ KJ Booking System</p>
    </div>`;
    // Send to both client and husband
    await resend.emails.send({ from: 'DJ KJ Bookings <bookings@djkjatx.com>', to: HUSBAND_EMAIL, cc: HUSBAND_CC, subject: `Signed Agreement — ${client.name} / ${eventDate}`, html: contractHtml, attachments });
    payload = { from: 'DJ KJ Bookings <bookings@djkjatx.com>', to: client.email, subject: `Your Signed DJ KJ Agreement — ${eventDate}`, html: contractHtml, attachments };
  } else if (type === 'confirmed') {
    payload = {
      from: 'DJ KJ Bookings <bookings@djkjatx.com>',
      to: client.email,
      subject: "You're Booked! 🎉 DJ KJ Confirmation",
      html: `<div style="${wrapStyle}">
        <h1 style="font-size:28px;margin:0 0 4px;">DJ KJ</h1>
        <p style="${mutedStyle}margin-top:0;">You're officially booked!</p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:20px 0;">
        <p>It's official — <strong>DJ KJ is booked for your event!</strong></p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="${labelStyle}padding:6px 0;">Event</td><td style="${valStyle}padding:6px 0;">${booking.event_type || 'TBD'}</td></tr>
          <tr><td style="${labelStyle}padding:6px 0;">Date</td><td style="${valStyle}padding:6px 0;">${eventDate}</td></tr>
          <tr><td style="${labelStyle}padding:6px 0;">Venue</td><td style="${valStyle}padding:6px 0;">${booking.venue || 'TBD'}</td></tr>
          <tr><td style="${labelStyle}padding:6px 0;">Time</td><td style="${valStyle}padding:6px 0;">${startTimeFormatted}${endTime ? ' – ' + endTime : ''}</td></tr>
          <tr><td style="${labelStyle}padding:6px 0;">Balance Due</td><td style="${valStyle}padding:6px 0;">$${balanceDollars} (due 24 hours before via CashApp $Kjwasington37)</td></tr>
        </table>
        <p>We'll be in touch closer to the date. Get ready to vibe!</p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:20px 0;">
        <p style="${mutedStyle}">— DJ KJ</p>
      </div>`,
    };
  } else if (type === 'balance_reminder') {
    payload = {
      from: 'DJ KJ Bookings <bookings@djkjatx.com>',
      to: client.email,
      subject: 'Balance Due Reminder — Your DJ KJ Event is Coming Up!',
      html: `<div style="${wrapStyle}">
        <h1 style="font-size:28px;margin:0 0 4px;">DJ KJ</h1>
        <p style="${mutedStyle}margin-top:0;">Balance Due Reminder</p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:20px 0;">
        <p>Hey <strong>${client.name}</strong>!</p>
        <p>Just a reminder that your balance of <strong>$${balanceDollars}</strong> is due 24 hours before your event.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="${labelStyle}padding:6px 0;">Event</td><td style="${valStyle}padding:6px 0;">${booking.event_type || 'Your Event'}</td></tr>
          <tr><td style="${labelStyle}padding:6px 0;">Date</td><td style="${valStyle}padding:6px 0;">${eventDate}</td></tr>
          <tr><td style="${labelStyle}padding:6px 0;">Balance Due</td><td style="${valStyle}padding:6px 0;">$${balanceDollars}</td></tr>
        </table>
        <p>Please send payment via CashApp to <strong>$Kjwasington37</strong> before ${eventDate}.</p>
        <p style="${mutedStyle}">Questions? Reply to this email.</p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:20px 0;">
        <p style="${mutedStyle}">— DJ KJ Team</p>
      </div>`,
    };
  } else {
    return res.status(400).json({ error: 'Unknown email type' });
  }

  if (payload) {
    const { data: emailData, error: emailError } = await resend.emails.send(payload as Parameters<typeof resend.emails.send>[0]);
    if (emailError) return res.status(500).json({ error: emailError.message });

    await supabase.from('email_log').insert({
      booking_id,
      type,
      to_email: Array.isArray(payload.to) ? payload.to.join(',') : payload.to,
      resend_id: emailData?.id,
      status: 'sent',
    });
  }

  return res.status(200).json({ success: true });
}
