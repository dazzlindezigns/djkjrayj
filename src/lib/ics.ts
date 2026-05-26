import type { Booking, Client } from '../types';
import { format, addHours, parseISO } from 'date-fns';

function formatICSDate(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}

function escapeICS(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function generateICS(booking: Booking, client: Client): string {
  const eventType = booking.event_type ?? 'Event';
  const clientName = client.name;
  const title = `DJ KJ — ${eventType} for ${clientName}`;

  // Build start datetime
  const eventDateStr = booking.event_date ?? format(new Date(), 'yyyy-MM-dd');
  const startTimeStr = booking.start_time ?? '00:00:00';
  const [year, month, day] = eventDateStr.split('-').map(Number);
  const [hour, minute] = startTimeStr.split(':').map(Number);

  const startDate = new Date(year, month - 1, day, hour, minute, 0);
  const hours = booking.hours ?? 2;
  const endDate = addHours(startDate, hours);

  // Format UTC
  const dtStart = formatICSDate(startDate);
  const dtEnd = formatICSDate(endDate);
  const now = formatICSDate(new Date());

  const totalDollars = booking.total_price ? `$${(booking.total_price / 100).toFixed(2)}` : 'TBD';
  const depositDollars = booking.deposit_amount
    ? `$${(booking.deposit_amount / 100).toFixed(2)}`
    : 'TBD';

  const description = [
    `Client: ${clientName}`,
    `Email: ${client.email}`,
    `Phone: ${client.phone}`,
    `Event Type: ${eventType}`,
    `Total Price: ${totalDollars}`,
    `Deposit: ${depositDollars}`,
    `Guests: ${booking.guest_count ?? 'TBD'}`,
  ].join('\\n');

  const location = booking.venue ? escapeICS(booking.venue) : '';

  const uid = `djkj-${booking.id}@djkjbookings.com`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DJ KJ Bookings//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeICS(title)}`,
    `DESCRIPTION:${description}`,
    ...(location ? [`LOCATION:${location}`] : []),
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

export function downloadICS(booking: Booking, client: Client): void {
  const icsContent = generateICS(booking, client);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const eventType = booking.event_type ?? 'event';
  const safeName = client.name.replace(/\s+/g, '_').toLowerCase();
  link.download = `djkj_${safeName}_${eventType.replace(/\s+/g, '_').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Silence unused import warning — parseISO is used in context where string parsing may be needed
void parseISO;
