import type { BookingStatus } from '../types';

interface StatusBadgeProps {
  status: BookingStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; color: string; bg: string }
> = {
  inquiry_sent: {
    label: 'Inquiry Sent',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.15)',
  },
  inquiry_submitted: {
    label: 'Awaiting Response',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.15)',
  },
  confirmed: {
    label: 'Confirmed',
    color: '#eab308',
    bg: 'rgba(234,179,8,0.15)',
  },
  agreement_sent: {
    label: 'Agreement Sent',
    color: '#eab308',
    bg: 'rgba(234,179,8,0.15)',
  },
  signed: {
    label: 'Signed',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.15)',
  },
  deposit_paid: {
    label: 'Deposit Paid',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.15)',
  },
  completed: {
    label: 'Completed',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.15)',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.15)',
  },
};

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    color: 'rgba(255,255,255,0.5)',
    bg: 'rgba(255,255,255,0.08)',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${className}`}
      style={{
        color: config.color,
        backgroundColor: config.bg,
        border: `1px solid ${config.color}33`,
      }}
    >
      {config.label}
    </span>
  );
}
