import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContractRequest {
  booking_id: string;
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

function formatSignedAt(isoStr: string | null): string {
  if (!isoStr) return 'TBD';
  try {
    return new Date(isoStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

async function generatePDF(booking: BookingRow): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size

  // Fonts
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const { width, height } = page.getSize();
  const margin = 60;
  const contentWidth = width - margin * 2;

  // Color helpers
  const dark = rgb(0.04, 0.04, 0.06);
  const blue = rgb(0.23, 0.51, 0.96);
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.85, 0.85, 0.85);
  const white = rgb(1, 1, 1);
  const green = rgb(0.13, 0.77, 0.37);

  let y = height - margin;

  // ─── HEADER BACKGROUND ───
  page.drawRectangle({
    x: 0,
    y: height - 120,
    width,
    height: 120,
    color: dark,
  });

  // DJ KJ Title
  page.drawText('DJ KJ', {
    x: margin,
    y: height - 58,
    size: 38,
    font: fontBold,
    color: white,
  });

  // Booking Agreement
  page.drawText('BOOKING AGREEMENT', {
    x: margin,
    y: height - 82,
    size: 12,
    font: fontRegular,
    color: rgb(0.7, 0.7, 0.7),
    letterSpacing: 1.5,
  });

  // Location
  page.drawText('Pflugerville, TX', {
    x: margin,
    y: height - 100,
    size: 9,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  // CashApp right aligned
  const cashText = 'CashApp: $Kjwasington37';
  const cashWidth = fontRegular.widthOfTextAtSize(cashText, 9);
  page.drawText(cashText, {
    x: width - margin - cashWidth,
    y: height - 100,
    size: 9,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  y = height - 140;

  // ─── DIVIDER ───
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: lightGray,
  });
  y -= 20;

  // ─── EVENT DETAILS TABLE ───
  page.drawText('EVENT DETAILS', {
    x: margin,
    y,
    size: 9,
    font: fontBold,
    color: blue,
    letterSpacing: 1.5,
  });
  y -= 16;

  const client = booking.clients;
  const tableData: [string, string][] = [
    ['Client Name', client?.name ?? 'N/A'],
    ['Email', client?.email ?? 'N/A'],
    ['Phone', client?.phone ?? 'N/A'],
    ['Event Date', formatDate(booking.event_date)],
    ['Event Type', booking.event_type ?? 'N/A'],
    ['Venue / Location', booking.venue ?? 'N/A'],
    ['Guest Count', booking.guest_count?.toString() ?? 'N/A'],
    ['Start Time', booking.start_time ?? 'N/A'],
    ['Duration', booking.hours ? `${booking.hours} hours` : 'N/A'],
    ['Package', booking.package_name ?? 'N/A'],
    ['Total Price', formatCents(booking.total_price)],
    ['Deposit Amount', formatCents(booking.deposit_amount)],
  ];

  const colLeft = margin;
  const colRight = margin + contentWidth / 2 + 10;
  let rowY = y;
  let isLeft = true;

  for (const [label, value] of tableData) {
    const x = isLeft ? colLeft : colRight;

    // Background for alternating rows
    if (isLeft) {
      page.drawRectangle({
        x: margin - 4,
        y: rowY - 14,
        width: contentWidth + 8,
        height: 22,
        color: rgb(0.97, 0.97, 0.98),
        opacity: 0.5,
      });
    }

    page.drawText(label + ':', {
      x,
      y: rowY,
      size: 8,
      font: fontBold,
      color: gray,
    });
    page.drawText(value, {
      x: x + 110,
      y: rowY,
      size: 9,
      font: fontRegular,
      color: dark,
      maxWidth: contentWidth / 2 - 115,
    });

    if (!isLeft) {
      rowY -= 22;
    }
    isLeft = !isLeft;
  }

  // Handle odd row
  if (!isLeft) {
    rowY -= 22;
  }

  y = rowY - 10;

  // ─── DIVIDER ───
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.5,
    color: lightGray,
  });
  y -= 18;

  // ─── TERMS ───
  page.drawText('TERMS & CONDITIONS', {
    x: margin,
    y,
    size: 9,
    font: fontBold,
    color: blue,
    letterSpacing: 1.5,
  });
  y -= 14;

  const terms = [
    ['1. Services', 'DJ KJ agrees to provide DJ/music entertainment services for the duration specified. Services include music mixing, sound system, and optional lighting as agreed.'],
    ['2. Deposit & Payment', `A non-refundable deposit of ${formatCents(booking.deposit_amount)} is required to secure the date. Remaining balance due in cash or via CashApp ($Kjwasington37) on or before the event.`],
    ['3. Cancellation', "Cancellations made less than 14 days before the event forfeit the full deposit. Cancellations with 14+ days notice may receive a credit at DJ KJ's discretion."],
    ['4. Client Responsibilities', 'Client agrees to provide a safe, accessible performance area with adequate power supply (standard 120V outlets) and is responsible for obtaining any necessary permits.'],
    ['5. Equipment & Liability', 'DJ KJ will not be held liable for circumstances beyond his control (weather, power failure, acts of God). DJ KJ carries his own equipment insurance.'],
    ['6. Music & Content', "DJ KJ will honor music requests to the best of his ability. Final song selection is at DJ KJ's professional discretion. Performance will remain family-appropriate unless otherwise agreed."],
  ];

  for (const [termTitle, termText] of terms) {
    // Check if we need a new page (overflow protection)
    if (y < 120) {
      pdfDoc.addPage([612, 792]);
      // Continue on original page with reduced spacing
    }

    page.drawText(termTitle, {
      x: margin,
      y,
      size: 9,
      font: fontBold,
      color: dark,
    });
    y -= 11;

    // Word wrap for term text
    const words = termText.split(' ');
    let line = '';
    const lineHeight = 10;
    const textSize = 8;

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const testWidth = fontRegular.widthOfTextAtSize(testLine, textSize);
      if (testWidth > contentWidth - 10) {
        page.drawText(line, {
          x: margin + 8,
          y,
          size: textSize,
          font: fontRegular,
          color: gray,
        });
        y -= lineHeight;
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      page.drawText(line, {
        x: margin + 8,
        y,
        size: textSize,
        font: fontRegular,
        color: gray,
      });
      y -= lineHeight;
    }
    y -= 8;
  }

  y -= 4;

  // ─── SIGNATURE SECTION ───
  if (y > 80) {
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.5,
      color: lightGray,
    });
    y -= 16;

    page.drawText('SIGNATURE', {
      x: margin,
      y,
      size: 9,
      font: fontBold,
      color: blue,
      letterSpacing: 1.5,
    });
    y -= 16;

    // Signature line left
    page.drawText('Client Signature:', {
      x: margin,
      y,
      size: 8,
      font: fontBold,
      color: gray,
    });

    if (booking.client_signature) {
      page.drawText(booking.client_signature, {
        x: margin + 110,
        y,
        size: 13,
        font: fontOblique,
        color: dark,
      });
    }

    page.drawLine({
      start: { x: margin + 105, y: y - 3 },
      end: { x: margin + 105 + 180, y: y - 3 },
      thickness: 0.5,
      color: rgb(0.6, 0.6, 0.6),
    });

    y -= 16;

    page.drawText('Date Signed:', {
      x: margin,
      y,
      size: 8,
      font: fontBold,
      color: gray,
    });

    page.drawText(formatSignedAt(booking.signed_at), {
      x: margin + 110,
      y,
      size: 8,
      font: fontRegular,
      color: dark,
    });

    y -= 16;

    // Electronically signed notice
    page.drawRectangle({
      x: margin,
      y: y - 14,
      width: contentWidth,
      height: 22,
      color: rgb(0.13, 0.77, 0.37),
      opacity: 0.08,
    });
    page.drawText('✓ Electronically signed via DJ KJ Bookings', {
      x: margin + 8,
      y: y - 6,
      size: 8,
      font: fontBold,
      color: green,
    });
  }

  // ─── FOOTER ───
  const footerY = 30;
  page.drawLine({
    start: { x: margin, y: footerY + 16 },
    end: { x: width - margin, y: footerY + 16 },
    thickness: 0.5,
    color: lightGray,
  });

  page.drawText('DJ KJ Booking · Pflugerville, TX · CashApp: $Kjwasington37', {
    x: margin,
    y: footerY,
    size: 8,
    font: fontRegular,
    color: rgb(0.6, 0.6, 0.6),
  });

  const pageNumText = 'Page 1';
  const pageNumWidth = fontRegular.widthOfTextAtSize(pageNumText, 8);
  page.drawText(pageNumText, {
    x: width - margin - pageNumWidth,
    y: footerY,
    size: 8,
    font: fontRegular,
    color: rgb(0.6, 0.6, 0.6),
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as ContractRequest;
    const { booking_id } = body;

    if (!booking_id) {
      return new Response(JSON.stringify({ error: 'Missing booking_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabase = createClient(supabaseUrl, serviceKey, {
      db: { schema: 'djkj' },
    });

    // Fetch booking
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

    // Generate PDF
    const pdfBytes = await generatePDF(booking);

    // Convert to base64
    const base64Pdf = btoa(
      Array.from(pdfBytes)
        .map((b) => String.fromCharCode(b))
        .join('')
    );

    // Upload to Supabase Storage
    const pdfPath = `${booking_id}/agreement.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(pdfPath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.warn('Storage upload failed (bucket may not exist):', uploadError.message);
      // Continue anyway — we'll still send the email with the attachment
    }

    // Update booking with PDF path and ensure status is 'signed'
    await supabase
      .from('bookings')
      .update({
        contract_pdf_path: uploadError ? null : pdfPath,
        ...(booking.status !== 'signed' ? { status: 'signed' } : {}),
      })
      .eq('id', booking_id);

    // Send contract email with PDF attachment
    await supabase.functions.invoke('send-email', {
      body: {
        type: 'contract',
        booking_id,
        attachment_base64: base64Pdf,
      },
    });

    return new Response(
      JSON.stringify({ success: true, pdf_path: pdfPath }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('generate-contract error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
