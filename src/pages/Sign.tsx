import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { supabase } from '../supabase';
import type { Booking, Client } from '../types';
import { generateContract } from '../lib/email';

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'TBD';
  try {
    return format(parseISO(dateStr), 'EEEE, MMMM d, yyyy');
  } catch {
    return dateStr;
  }
}

function formatCents(cents?: number | null): string {
  if (cents == null) return 'TBD';
  return `$${(cents / 100).toFixed(2)}`;
}

const AGREEMENT_TERMS = [
  {
    title: 'Services',
    text: 'DJ KJ agrees to provide DJ/music entertainment services as described in this agreement for the duration specified. Services include music mixing, sound system, and optional lighting as agreed.',
  },
  {
    title: 'Deposit & Payment',
    text: 'A non-refundable deposit is required to secure the date. The remaining balance is due in cash or CashApp ($Kjwasington37) on or before the event date. DJ KJ reserves the right to cancel if payment is not received.',
  },
  {
    title: 'Cancellation Policy',
    text: 'Cancellations made less than 14 days before the event forfeit the full deposit. Cancellations with more than 14 days notice may receive a credit toward a future booking at DJ KJ\'s discretion.',
  },
  {
    title: 'Client Responsibilities',
    text: 'Client agrees to provide a safe, accessible performance area with adequate power supply (standard 120V outlets). Client is responsible for obtaining any necessary permits or venue approvals.',
  },
  {
    title: 'Equipment & Liability',
    text: 'DJ KJ will arrive with professional-grade equipment. Client agrees to not hold DJ KJ liable for circumstances beyond his control (weather, power failure, acts of God). DJ KJ carries his own equipment insurance.',
  },
  {
    title: 'Music & Content',
    text: 'DJ KJ will use best efforts to honor music requests. Final song selection is at DJ KJ\'s professional discretion. DJ KJ will keep the performance family-appropriate unless otherwise agreed in writing.',
  },
];

export default function Sign() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState('');

  const [agreed, setAgreed] = useState(false);
  const [signatureName, setSignatureName] = useState('');

  useEffect(() => {
    async function load() {
      if (!id) {
        setError('Invalid link.');
        setLoading(false);
        return;
      }

      const { data, error: err } = await supabase
        .from('bookings')
        .select('*, clients(*)')
        .eq('id', id)
        .single();

      if (err || !data) {
        setError('This signing link is invalid or has expired.');
        setLoading(false);
        return;
      }

      const b = data as Booking;

      if (b.status === 'signed' || b.status === 'deposit_paid' || b.status === 'completed') {
        setSigned(true);
      }

      setBooking(b);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSign(e: React.FormEvent) {
    e.preventDefault();
    if (!booking) return;
    if (!agreed) {
      setError('Please check the agreement checkbox.');
      return;
    }
    if (!signatureName.trim()) {
      setError('Please type your full name to sign.');
      return;
    }

    setSigning(true);
    setError('');

    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'signed',
        client_signature: signatureName.trim(),
        signed_at: now,
      })
      .eq('id', booking.id);

    if (updateError) {
      setError('Failed to save signature. Please try again.');
      setSigning(false);
      return;
    }

    // Generate contract PDF and send emails
    await generateContract(booking.id);

    setSigned(true);
    setSigning(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#3b82f6' }} />
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: '#0a0a0f' }}>
        <div className="text-4xl mb-4">🎧</div>
        <h1 className="text-xl font-bold mb-2" style={{ fontFamily: 'Orbitron, sans-serif', color: '#fff' }}>DJ KJ</h1>
        <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>{error}</p>
      </div>
    );
  }

  const client = booking?.clients as Client | undefined;
  const cashAppUrl = import.meta.env.VITE_CASHAPP_URL || 'https://cash.app/$Kjwasington37';
  const depositAmt = booking?.deposit_amount;
  const cashAppLink = depositAmt
    ? `${cashAppUrl}/${(depositAmt / 100).toFixed(2)}`
    : cashAppUrl;

  if (signed) {
    return (
      <div className="min-h-screen pb-10" style={{ background: '#0a0a0f', fontFamily: 'Rajdhani, sans-serif' }}>
        <div className="max-w-lg mx-auto px-4 pt-8">
          {/* Header */}
          <div className="text-center mb-8">
            <img
              src="/icons/icon-512.png"
              alt="DJ KJ"
              className="mx-auto"
              style={{ width: '120px', height: '120px', objectFit: 'contain' }}
            />
          </div>

          {/* Signed confirmation */}
          <div
            className="rounded-2xl p-6 text-center mb-6"
            style={{
              background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(22,163,74,0.05))',
              border: '1px solid rgba(34,197,94,0.3)',
            }}
          >
            <div className="text-4xl mb-3">✍️</div>
            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Orbitron, sans-serif', color: '#22c55e' }}>
              Agreement Signed!
            </h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Lock in your date with the deposit payment below.
            </p>
          </div>

          {/* Booking summary */}
          <div className="rounded-2xl p-5 mb-6" style={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Orbitron, sans-serif', fontSize: '10px' }}>
              Booking Summary
            </h3>
            <div className="flex flex-col gap-3">
              {client && (
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Client</span>
                  <span className="text-sm font-semibold" style={{ color: '#fff' }}>{client.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Event Date</span>
                <span className="text-sm font-semibold" style={{ color: '#fff' }}>{formatDate(booking?.event_date)}</span>
              </div>
              {booking?.event_type && (
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Event Type</span>
                  <span className="text-sm font-semibold" style={{ color: '#fff' }}>{booking.event_type}</span>
                </div>
              )}
              {booking?.venue && (
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Venue</span>
                  <span className="text-sm font-semibold text-right" style={{ color: '#fff', maxWidth: '60%' }}>{booking.venue}</span>
                </div>
              )}
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Total Price</span>
                <span className="text-sm font-bold" style={{ color: '#22c55e' }}>{formatCents(booking?.total_price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Deposit Due Now</span>
                <span className="text-sm font-bold" style={{ color: '#eab308' }}>{formatCents(booking?.deposit_amount)}</span>
              </div>
            </div>
          </div>

          {/* CashApp payment */}
          <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(0,200,5,0.05)', border: '1px solid rgba(0,200,5,0.2)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-black text-lg"
                style={{ background: '#00c805', color: '#000', fontFamily: 'Orbitron, sans-serif' }}
              >
                $
              </div>
              <div>
                <p className="font-bold" style={{ color: '#fff' }}>Pay via CashApp</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>$Kjwasington37</p>
              </div>
            </div>

            <a
              href={cashAppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-4 rounded-xl font-bold text-base text-center"
              style={{
                background: '#00c805',
                color: '#000',
                letterSpacing: '0.05em',
              }}
            >
              Pay {formatCents(depositAmt)} Deposit
            </a>

            <p className="text-xs text-center mt-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Screenshot your payment confirmation and text or DM it to DJ KJ to confirm your booking.
            </p>
          </div>

          <div className="rounded-xl p-4" style={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Questions? Text or DM DJ KJ · Pflugerville, TX
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10" style={{ background: '#0a0a0f', fontFamily: 'Rajdhani, sans-serif' }}>
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="text-center py-8">
          <img
            src="/icons/icon-512.png"
            alt="DJ KJ"
            className="mx-auto mb-2"
            style={{ width: '120px', height: '120px', objectFit: 'contain' }}
          />
          <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Booking Agreement
          </p>
        </div>

        {/* Booking Details */}
        <div className="rounded-2xl p-5 mb-5" style={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Orbitron, sans-serif', fontSize: '10px' }}>
            Event Details
          </h2>
          <div className="flex flex-col gap-3">
            {client && (
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Client</span>
                <span className="text-sm font-semibold" style={{ color: '#fff' }}>{client.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Event Date</span>
              <span className="text-sm font-semibold" style={{ color: '#fff' }}>{formatDate(booking?.event_date)}</span>
            </div>
            {booking?.event_type && (
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Event Type</span>
                <span className="text-sm font-semibold" style={{ color: '#fff' }}>{booking.event_type}</span>
              </div>
            )}
            {booking?.venue && (
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Venue</span>
                <span className="text-sm font-semibold text-right" style={{ color: '#fff', maxWidth: '60%' }}>{booking.venue}</span>
              </div>
            )}
            {booking?.start_time && (
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Start Time</span>
                <span className="text-sm font-semibold" style={{ color: '#fff' }}>{booking.start_time}</span>
              </div>
            )}
            {booking?.hours && (
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Duration</span>
                <span className="text-sm font-semibold" style={{ color: '#fff' }}>{booking.hours} hours</span>
              </div>
            )}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
            <div className="flex justify-between">
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Total Price</span>
              <span className="text-sm font-bold" style={{ color: '#22c55e' }}>{formatCents(booking?.total_price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Deposit</span>
              <span className="text-sm font-bold" style={{ color: '#eab308' }}>{formatCents(booking?.deposit_amount)}</span>
            </div>
            {booking?.package_name && (
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Package</span>
                <span className="text-sm font-semibold" style={{ color: '#fff' }}>{booking.package_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Agreement Terms */}
        <div className="rounded-2xl p-5 mb-5" style={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2
            className="text-xs font-bold uppercase tracking-widest mb-4"
            style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Orbitron, sans-serif', fontSize: '10px' }}
          >
            Agreement Terms
          </h2>
          <div className="flex flex-col gap-5">
            {AGREEMENT_TERMS.map((term, i) => (
              <div key={i}>
                <p className="text-sm font-bold mb-1.5" style={{ color: '#fff' }}>
                  {i + 1}. {term.title}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {term.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Signing Section */}
        <form onSubmit={handleSign}>
          <div className="rounded-2xl p-5 mb-5" style={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Orbitron, sans-serif', fontSize: '10px' }}
            >
              Sign Agreement
            </h2>

            {/* Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer mb-5">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: agreed ? '#3b82f6' : 'rgba(255,255,255,0.06)',
                    border: agreed ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  {agreed && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L4.5 8.5L10 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                I have read and agree to all terms in this Booking Agreement. I understand the deposit is non-refundable and payment locks in my date.
              </span>
            </label>

            {/* Signature input */}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Type your full name to sign <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder={client?.name || 'Your full name'}
                className="italic"
                style={{ fontSize: '1.125rem' }}
              />
              <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Typing your name constitutes a legal electronic signature.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl p-3 text-sm font-semibold" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={signing || !agreed || !signatureName.trim()}
            className="w-full py-4 rounded-xl font-bold text-base mb-4"
            style={{
              background:
                !agreed || !signatureName.trim()
                  ? 'rgba(255,255,255,0.08)'
                  : signing
                    ? 'rgba(59,130,246,0.5)'
                    : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: !agreed || !signatureName.trim() ? 'rgba(255,255,255,0.3)' : '#fff',
              cursor: !agreed || !signatureName.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {signing ? 'Signing...' : 'Sign Agreement'}
          </button>

          <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
            DJ KJ · Pflugerville, TX · CashApp: $Kjwasington37
          </p>
        </form>
      </div>
    </div>
  );
}
