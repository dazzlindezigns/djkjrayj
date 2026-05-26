import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { supabase } from '../supabase';
import type { Booking } from '../types';

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="p-0 border-none bg-transparent cursor-pointer"
            style={{ lineHeight: 1 }}
            aria-label={`${star} star`}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill={filled ? '#8b5cf6' : 'none'}
              stroke={filled ? '#8b5cf6' : 'rgba(255,255,255,0.2)'}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: 'block', transition: 'fill 0.1s, stroke 0.1s' }}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

type ViewState = 'loading' | 'form' | 'already_submitted' | 'success' | 'error';

export default function Survey() {
  const { bookingId } = useParams<{ bookingId: string }>();

  const [view, setView] = useState<ViewState>('loading');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [appRating, setAppRating] = useState(0);
  const [appComments, setAppComments] = useState('');
  const [djRating, setDjRating] = useState(0);
  const [djComments, setDjComments] = useState('');

  useEffect(() => {
    if (!bookingId) {
      setLoadError('Invalid survey link.');
      setView('error');
      return;
    }

    async function load() {
      // Load booking
      const { data: bData, error: bErr } = await supabase
        .from('bookings')
        .select('*, clients(*)')
        .eq('id', bookingId)
        .single();

      if (bErr || !bData) {
        setLoadError('Booking not found. Please check your survey link.');
        setView('error');
        return;
      }

      setBooking(bData as Booking);

      // Check if survey already submitted
      const { data: sData } = await supabase
        .from('surveys')
        .select('id')
        .eq('booking_id', bookingId)
        .maybeSingle();

      if (sData) {
        setView('already_submitted');
        return;
      }

      setView('form');
    }

    load();
  }, [bookingId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingId) return;

    setSubmitting(true);
    setSubmitError('');

    const { error } = await supabase.from('surveys').insert({
      booking_id: bookingId,
      app_rating: appRating || null,
      app_comments: appComments.trim() || null,
      dj_rating: djRating || null,
      dj_comments: djComments.trim() || null,
    });

    if (error) {
      if (error.code === '23505') {
        // unique constraint — already submitted
        setView('already_submitted');
      } else {
        setSubmitError(error.message || 'Something went wrong. Please try again.');
      }
      setSubmitting(false);
      return;
    }

    setView('success');
    setSubmitting(false);
  }

  function formatDate(dateStr?: string | null): string {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'MMMM d, yyyy');
    } catch {
      return dateStr;
    }
  }

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#0a0a0f',
    fontFamily: 'Rajdhani, sans-serif',
    color: '#ffffff',
    padding: '0 16px 48px',
  };

  const cardStyle: React.CSSProperties = {
    maxWidth: 480,
    margin: '0 auto',
    paddingTop: 40,
  };

  const sectionStyle: React.CSSProperties = {
    background: '#12121a',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: '20px',
    marginBottom: 16,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Orbitron, sans-serif',
    marginBottom: 12,
    display: 'block',
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    background: '#1a1a26',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    color: '#ffffff',
    padding: '10px 12px',
    fontSize: 14,
    fontFamily: 'Rajdhani, sans-serif',
    resize: 'vertical',
    marginTop: 12,
    outline: 'none',
  };

  if (view === 'loading') {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          className="rounded-full animate-spin"
          style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6' }}
        />
      </div>
    );
  }

  if (view === 'error') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <img src="/icons/icon-192.png" alt="DJ KJ" style={{ width: 80, margin: '0 auto 24px', display: 'block', borderRadius: 12 }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>{loadError || 'Something went wrong.'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'already_submitted') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <img src="/icons/icon-192.png" alt="DJ KJ" style={{ width: 120, margin: '0 auto 24px', display: 'block', borderRadius: 16 }} />
            <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
            <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 20, marginBottom: 12, color: '#818cf8' }}>
              Already Submitted
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>
              You've already submitted a review. Thank you!
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'success') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <img src="/icons/icon-192.png" alt="DJ KJ" style={{ width: 120, margin: '0 auto 24px', display: 'block', borderRadius: 16 }} />
            <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
            <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 22, marginBottom: 12, color: '#ffffff' }}>
              Thank you for your feedback!
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
              Your review helps DJ KJ improve and grow. We appreciate you!
            </p>
            {(djRating >= 4) && (
              <div
                style={{
                  background: 'rgba(139,92,246,0.12)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  borderRadius: 12,
                  padding: '14px 18px',
                  color: '#a78bfa',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Loved the experience? Leave us a Google review! ⭐
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // form view
  const client = booking?.clients;
  const eventDate = formatDate(booking?.event_date);

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img
            src="/icons/icon-192.png"
            alt="DJ KJ"
            style={{ width: 120, borderRadius: 16, display: 'inline-block' }}
          />
        </div>

        {/* Heading */}
        <h1
          style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: 22,
            textAlign: 'center',
            marginBottom: 8,
            color: '#ffffff',
            lineHeight: 1.3,
          }}
        >
          How was your experience?
        </h1>

        {/* Booking summary */}
        {(client?.name || booking?.event_type || eventDate) && (
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            {client?.name && (
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: 600, margin: '4px 0' }}>
                {client.name}
              </p>
            )}
            {booking?.event_type && (
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: '2px 0' }}>
                {booking.event_type}
              </p>
            )}
            {eventDate && (
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: '2px 0' }}>
                {eventDate}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Section 1: Booking Process */}
          <div style={sectionStyle}>
            <span style={labelStyle}>The Booking Process</span>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 14, marginTop: 0 }}>
              How easy was it to book DJ KJ?
            </p>
            <StarRating value={appRating} onChange={setAppRating} />
            <textarea
              placeholder="Any comments? (optional)"
              value={appComments}
              onChange={(e) => setAppComments(e.target.value)}
              rows={3}
              style={textareaStyle}
            />
          </div>

          {/* Section 2: DJ Performance */}
          <div style={sectionStyle}>
            <span style={labelStyle}>DJ KJ's Performance</span>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 14, marginTop: 0 }}>
              How was DJ KJ at your event?
            </p>
            <StarRating value={djRating} onChange={setDjRating} />
            <textarea
              placeholder="Any comments? (optional)"
              value={djComments}
              onChange={(e) => setDjComments(e.target.value)}
              rows={3}
              style={textareaStyle}
            />
          </div>

          {submitError && (
            <div
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10,
                padding: '10px 14px',
                color: '#ef4444',
                fontSize: 13,
                marginBottom: 14,
              }}
            >
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 15,
              fontFamily: 'Rajdhani, sans-serif',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              background: submitting
                ? 'rgba(99,102,241,0.5)'
                : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: '#ffffff',
              letterSpacing: '0.04em',
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  );
}
