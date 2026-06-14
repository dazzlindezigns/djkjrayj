import { createClient } from '@supabase/supabase-js';
import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'djkj' } }
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { booking_id } = req.body;

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*, clients(*)')
    .eq('id', booking_id)
    .single();

  if (error || !booking) return res.status(404).json({ error: 'Booking not found' });

  const client = booking.clients as { name: string; email: string; phone: string };

  // Format values
  const totalDollars = booking.total_price ? `$${(booking.total_price / 100).toFixed(2)}` : 'TBD';
  const depositDollars = booking.deposit_amount ? `$${(booking.deposit_amount / 100).toFixed(2)}` : 'TBD';
  const discountOff = booking.discount_amount_off ?? 0;
  const balanceDollars = booking.total_price && booking.deposit_amount
    ? `$${((booking.total_price - booking.deposit_amount - discountOff) / 100).toFixed(2)}`
    : 'TBD';
  const discountDollars = discountOff > 0 ? `-$${(discountOff / 100).toFixed(2)}` : null;

  const eventDate = booking.event_date
    ? new Date(booking.event_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'TBD';

  let endTime = 'TBD';
  if (booking.start_time && booking.hours) {
    const [h, m] = booking.start_time.split(':').map(Number);
    const end = new Date(2000, 0, 1, h + booking.hours, m);
    endTime = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  const startTimeFormatted = booking.start_time
    ? new Date(`2000-01-01T${booking.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : 'TBD';

  const signedAt = booking.signed_at
    ? new Date(booking.signed_at).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })
    : new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });

  // Generate PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage(PageSizes.Letter);
  const { width, height } = page.getSize();
  const margin = 72;
  const contentWidth = width - margin * 2;

  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const black = rgb(0, 0, 0);
  const gray = rgb(0.5, 0.5, 0.5);
  const darkGray = rgb(0.3, 0.3, 0.3);

  let y = height - margin;

  // Header
  page.drawText('DJ KJ', { x: margin, y, font: boldFont, size: 28, color: black });
  y -= 22;
  page.drawText('Booking Agreement', { x: margin, y, font: regularFont, size: 16, color: darkGray });
  y -= 16;
  page.drawText('Pflugerville, TX', { x: margin, y, font: regularFont, size: 11, color: gray });
  y -= 18;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  y -= 20;

  // Event Details
  page.drawText('EVENT DETAILS', { x: margin, y, font: boldFont, size: 11, color: darkGray });
  y -= 16;

  const detailRows: [string, string][] = [
    ['Event Date', eventDate],
    ['Event Type', booking.event_type || 'TBD'],
    ['Venue', booking.venue || 'TBD'],
    ['Guest Count', booking.guest_count ? String(booking.guest_count) : 'TBD'],
    ['Performance Hours', booking.hours ? `${booking.hours} hours` : 'TBD'],
    ['Start Time', startTimeFormatted],
    ['End Time', endTime],
    ['Total Price', totalDollars],
    ...(discountDollars ? [['Discount', discountDollars] as [string, string]] : []),
    ['Deposit Due', depositDollars],
    ['Balance Due', balanceDollars],
  ];

  for (const [label, value] of detailRows) {
    page.drawText(label + ':', { x: margin, y, font: boldFont, size: 10, color: darkGray });
    page.drawText(value, { x: margin + 160, y, font: regularFont, size: 10, color: black });
    y -= 15;
  }

  y -= 10;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  y -= 16;

  // Terms
  page.drawText('TERMS', { x: margin, y, font: boldFont, size: 11, color: darkGray });
  y -= 16;

  const terms = [
    `1. DEPOSIT & PAYMENT. A non-refundable deposit of ${depositDollars} is due within 48 hours of signing to secure the date. The remaining balance of ${balanceDollars} is due no later than 24 hours before the event. All payments are made via CashApp to $Kjwasington37.`,
    `2. CANCELLATION. Cancellations made more than 14 days before the event forfeit the deposit only. Cancellations within 14 days of the event are subject to the full balance.`,
    `3. PERFORMANCE. DJ KJ will provide professional DJ services for the agreed time. Client is responsible for ensuring adequate power and setup space.`,
    `4. OVERTIME. If the event runs beyond the agreed time, overtime will be billed at the hourly rate in 30-minute increments and must be paid before the set ends.`,
    `5. MUSIC. DJ KJ will make every effort to accommodate song and genre requests. The Performer reserves the right to use professional judgment on song selection to maintain the vibe.`,
    `6. LIABILITY. DJ KJ is not responsible for venue or technical issues outside of the Performer's control.`,
  ];

  function wrapAndDraw(text: string, font: typeof regularFont, size: number, color: typeof black) {
    const words = text.split(' ');
    let line = '';
    const lines: string[] = [];
    for (const word of words) {
      const testLine = line ? line + ' ' + word : word;
      if (font.widthOfTextAtSize(testLine, size) > contentWidth) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);
    for (const l of lines) {
      if (y < 160) break;
      page.drawText(l, { x: margin, y, font, size, color });
      y -= size + 4;
    }
  }

  for (const term of terms) {
    wrapAndDraw(term, regularFont, 9, black);
    y -= 4;
  }

  // Custom terms addendum
  if (booking.custom_terms) {
    y -= 8;
    page.drawText('ADDENDUM', { x: margin, y, font: boldFont, size: 10, color: darkGray });
    y -= 14;
    wrapAndDraw(booking.custom_terms, regularFont, 9, black);
  }

  // Signature section
  y -= 10;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  y -= 16;

  page.drawText('SIGNATURE', { x: margin, y, font: boldFont, size: 11, color: darkGray });
  y -= 16;

  page.drawText('Client Signature:', { x: margin, y, font: boldFont, size: 10, color: darkGray });
  page.drawText(booking.client_signature || '', { x: margin + 130, y, font: italicFont, size: 11, color: black });
  y -= 15;

  page.drawText('Date Signed:', { x: margin, y, font: boldFont, size: 10, color: darkGray });
  page.drawText(signedAt, { x: margin + 130, y, font: regularFont, size: 10, color: black });
  y -= 15;

  page.drawText('Client Name:', { x: margin, y, font: boldFont, size: 10, color: darkGray });
  page.drawText(client.name, { x: margin + 130, y, font: regularFont, size: 10, color: black });

  // Footer
  const footerY = margin / 2;
  page.drawLine({ start: { x: margin, y: footerY + 14 }, end: { x: width - margin, y: footerY + 14 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  page.drawText('DJ KJ Booking  ·  CashApp: $Kjwasington37', { x: margin, y: footerY, font: regularFont, size: 9, color: gray });
  page.drawText('Page 1 of 1', { x: width - margin - 50, y: footerY, font: regularFont, size: 9, color: gray });

  const pdfBytes = await pdfDoc.save();
  const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

  // Upload to Supabase Storage
  const storagePath = `${booking_id}/agreement.pdf`;
  const { error: uploadError } = await supabase.storage
    .from('contracts')
    .upload(storagePath, Buffer.from(pdfBytes), {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    // Continue even if upload fails — still send email
  }

  // Update booking with contract path
  await supabase
    .from('bookings')
    .update({ contract_pdf_path: storagePath })
    .eq('id', booking_id);

  const appUrl = process.env.VITE_APP_URL ?? '';
  const clientName = client.name;

  // Send contract email + push notification (best-effort)
  await Promise.allSettled([
    fetch(`${appUrl}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'contract', booking_id, attachment_base64: pdfBase64 }),
    }),
    fetch(`${appUrl}/api/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '✍️ Agreement Signed',
        body: `${clientName} just signed their booking agreement`,
        url: `/dashboard/booking/${booking_id}`,
      }),
    }),
  ]);

  return res.status(200).json({ success: true, path: storagePath });
}
