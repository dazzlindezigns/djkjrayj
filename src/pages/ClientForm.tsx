import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import type { Booking } from '../types';
import { sendEmail } from '../lib/email';

const EVENT_TYPES = [
  'Birthday Party',
  'Quinceañera',
  'Sweet 16',
  'Wedding',
  'School Dance',
  'Graduation Party',
  'Corporate Event',
  'Block Party',
  'House Party',
  'Other',
];

const PACKAGE_OPTIONS = [
  'Starter Set ($150) — 2 hrs, basic setup',
  'The Vibe ($275) — 3 hrs, lights + hype',
  'Full Send ($400) — 4+ hrs, full production',
  'No Preference',
];

export default function ClientForm() {
  const { token } = useParams<{ token: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState('');
  const [venue, setVenue] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [packagePref, setPackagePref] = useState('');
  const [startTime, setStartTime] = useState('');
  const [musicNotes, setMusicNotes] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  useEffect(() => {
    async function load() {
      if (!token) {
        setError('Invalid link.');
        setLoading(false);
        return;
      }

      const { data, error: err } = await supabase
        .from('bookings')
        .select('*, clients(*)')
        .eq('inquiry_token', token)
        .single();

      if (err || !data) {
        setError('This link is invalid or has expired.');
        setLoading(false);
        return;
      }

      const b = data as Booking;

      if (b.status !== 'inquiry_sent' && b.status !== 'inquiry_submitted') {
        setSubmitted(true);
      }

      setBooking(b);
      setLoading(false);
    }
    load();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!booking) return;
    if (!eventDate || !eventType) {
      setError('Event date and type are required.');
      return;
    }

    setSubmitting(true);
    setError('');

    const internalNotes = [
      musicNotes ? `Music/Vibe: ${musicNotes}` : '',
      specialRequests ? `Special Requests: ${specialRequests}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    // Extract package name without price info for storage
    const pkgName = packagePref ? packagePref.split(' ($')[0] : null;

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'inquiry_submitted',
        event_date: eventDate,
        event_type: eventType,
        venue: venue || null,
        guest_count: guestCount ? parseInt(guestCount) : null,
        package_name: pkgName,
        start_time: startTime || null,
        internal_notes: internalNotes || null,
      })
      .eq('id', booking.id);

    if (updateError) {
      setError('Failed to submit. Please try again.');
      setSubmitting(false);
      return;
    }

    // Notify DJ KJ
    await sendEmail('inquiry_notify', booking.id);

    setSubmitted(true);
    setSubmitting(false);
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
        <h1 className="text-xl font-bold mb-2" style={{ fontFamily: 'Orbitron, sans-serif', color: '#fff' }}>
          DJ KJ Bookings
        </h1>
        <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>{error}</p>
      </div>
    );
  }

  const clientName = booking?.clients?.name ?? 'there';

  if (submitted) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: '#0a0a0f' }}
      >
        <div
          className="w-full max-w-sm rounded-2xl p-8 text-center"
          style={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="text-5xl mb-4">🎉</div>
          <h1
            className="text-2xl font-black mb-2"
            style={{ fontFamily: 'Orbitron, sans-serif', color: '#fff' }}
          >
            You're all set!
          </h1>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Thanks {clientName}! DJ KJ received your details and will be in touch soon to confirm your booking.
          </p>
          <div
            className="rounded-xl p-4 text-left"
            style={{ background: '#1a1a26', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
              What's next?
            </p>
            <div className="flex flex-col gap-2">
              {[
                'DJ KJ reviews your request',
                'You receive a booking agreement',
                'Sign & pay deposit to lock in your date',
                'It\'s a party! 🎧',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span
                    className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
                    style={{ background: 'rgba(59,130,246,0.2)', color: '#3b82f6' }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs mt-6" style={{ color: 'rgba(255,255,255,0.25)' }}>
            DJ KJ · Pflugerville, TX
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: '#0a0a0f', fontFamily: 'Rajdhani, sans-serif' }}>
      {/* Background glow */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="text-center py-8">
          <h1
            className="text-3xl font-black mb-1"
            style={{
              fontFamily: 'Orbitron, sans-serif',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            DJ KJ
          </h1>
          <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Pflugerville, TX
          </p>
          <div className="mt-4 px-4 py-3 rounded-xl" style={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="font-semibold" style={{ color: '#fff' }}>
              Hey {clientName}! 👋
            </p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Fill out this form so DJ KJ can get your booking set up. Takes about 2 minutes!
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Event Date */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Event Date <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Event Type <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              required
            >
              <option value="">Select event type...</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Venue */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Venue / Location
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Address or venue name"
            />
          </div>

          {/* Guest Count */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Expected Guest Count
            </label>
            <input
              type="number"
              min="1"
              max="5000"
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
              placeholder="e.g. 50"
            />
          </div>

          {/* Package Preference */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Package Preference
            </label>
            <div className="flex flex-col gap-2">
              {PACKAGE_OPTIONS.map((pkg) => (
                <button
                  key={pkg}
                  type="button"
                  onClick={() => setPackagePref(pkg === packagePref ? '' : pkg)}
                  className="py-3 px-4 rounded-xl text-sm font-semibold text-left transition-all"
                  style={{
                    background: packagePref === pkg ? 'rgba(59,130,246,0.15)' : '#1a1a26',
                    border: packagePref === pkg ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                    color: packagePref === pkg ? '#3b82f6' : 'rgba(255,255,255,0.7)',
                  }}
                >
                  {pkg}
                </button>
              ))}
            </div>
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Preferred Start Time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          {/* Music Notes */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Music & Vibe Notes
            </label>
            <textarea
              value={musicNotes}
              onChange={(e) => setMusicNotes(e.target.value)}
              placeholder="What genres, artists, or vibe are you going for? Any must-plays or do-not-plays?"
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Special Requests */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Special Requests
            </label>
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Anything else we should know? Themed playlists, announcements, etc."
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          {error && (
            <div
              className="rounded-xl p-3 text-sm font-semibold"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-xl font-bold text-base"
            style={{
              background: submitting
                ? 'rgba(59,130,246,0.5)'
                : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: '#fff',
              letterSpacing: '0.05em',
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Booking Request'}
          </button>

          <p className="text-xs text-center pb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
            DJ KJ · Pflugerville, TX · CashApp: $Kjwasington37
          </p>
        </form>
      </div>
    </div>
  );
}
