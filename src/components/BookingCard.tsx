import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import type { Booking } from '../types';
import StatusBadge from './StatusBadge';

interface BookingCardProps {
  booking: Booking;
}

function formatCents(cents?: number): string {
  if (cents == null) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Date TBD';
  try {
    return format(parseISO(dateStr), 'EEE, MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export default function BookingCard({ booking }: BookingCardProps) {
  const navigate = useNavigate();
  const client = booking.clients;

  return (
    <button
      onClick={() => navigate(`/dashboard/booking/${booking.id}`)}
      className="w-full text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
      style={{
        background: '#12121a',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '1.125rem',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(59,130,246,0.4)';
        (e.currentTarget as HTMLButtonElement).style.background = '#1a1a26';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
        (e.currentTarget as HTMLButtonElement).style.background = '#12121a';
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-base truncate"
            style={{ color: '#ffffff', fontFamily: 'Rajdhani, sans-serif' }}
          >
            {client?.name ?? 'Unknown Client'}
          </h3>
          <p className="text-sm truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {booking.event_type ?? 'Event type TBD'}
          </p>
        </div>
        <StatusBadge status={booking.status} className="flex-shrink-0 mt-0.5" />
      </div>

      <div className="flex items-center justify-between gap-2 mt-3">
        <div className="flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="text-xs font-medium">{formatDate(booking.event_date)}</span>
        </div>

        <div className="flex items-center gap-3">
          {booking.total_price != null && (
            <div className="text-right">
              <span className="text-xs font-semibold" style={{ color: '#818cf8' }}>
                {formatCents(booking.total_price)}
              </span>
              {booking.deposit_amount != null && (
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {' '}
                  / {formatCents(booking.deposit_amount)} dep
                </span>
              )}
            </div>
          )}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </button>
  );
}
