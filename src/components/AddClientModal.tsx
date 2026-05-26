import { useState } from 'react';
import { supabase } from '../supabase';
import { sendEmail } from '../lib/email';

interface AddClientModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type Mode = 'quick_book' | 'inquiry';

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

const PACKAGES = [
  { name: 'Starter Set', price: 150 },
  { name: 'The Vibe', price: 275 },
  { name: 'Full Send', price: 400 },
  { name: 'Custom', price: 0 },
];

export default function AddClientModal({ onClose, onSuccess }: AddClientModalProps) {
  const [mode, setMode] = useState<Mode>('inquiry');

  // Client fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Quick Book event fields
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState('');
  const [venue, setVenue] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [startTime, setStartTime] = useState('');
  const [hours, setHours] = useState('');

  // Quick Book pricing fields
  const [selectedPackage, setSelectedPackage] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [musicNotes, setMusicNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Success states
  const [inquirySuccessLink, setInquirySuccessLink] = useState('');
  const [quickBookSuccessEmail, setQuickBookSuccessEmail] = useState('');

  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;

  function handlePackageSelect(pkgName: string) {
    setSelectedPackage(pkgName);
    const pkg = PACKAGES.find((p) => p.name === pkgName);
    if (pkg && pkg.price > 0) {
      setTotalPrice(String(pkg.price));
      setDepositAmount(String(Math.round(pkg.price / 2)));
    } else if (pkgName === 'Custom') {
      setTotalPrice('');
      setDepositAmount('');
    }
  }

  async function handleInquirySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('Name, email, and phone are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Create client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert({ name: name.trim(), email: email.trim(), phone: phone.trim(), notes: notes.trim() || null })
        .select()
        .single();

      if (clientError) throw clientError;

      // 2. Create booking
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({ client_id: clientData.id, status: 'inquiry_sent' })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // 3. Send inquiry invite email
      await sendEmail('inquiry_invite', bookingData.id);

      // 4. Show success with link
      const link = `${appUrl}/book/${bookingData.inquiry_token}`;
      setInquirySuccessLink(link);
      onSuccess();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickBookSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('Name, email, and phone are required.');
      return;
    }
    if (!eventDate) {
      setError('Event date is required.');
      return;
    }
    if (!totalPrice || !depositAmount) {
      setError('Total price and deposit amount are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Create client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert({ name: name.trim(), email: email.trim(), phone: phone.trim(), notes: notes.trim() || null })
        .select()
        .single();

      if (clientError) throw clientError;

      const totalCents = Math.round(parseFloat(totalPrice) * 100);
      const depositCents = Math.round(parseFloat(depositAmount) * 100);

      // 2. Create booking with all fields
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          client_id: clientData.id,
          status: 'agreement_sent',
          event_date: eventDate || null,
          event_type: eventType || null,
          venue: venue.trim() || null,
          guest_count: guestCount ? parseInt(guestCount) : null,
          start_time: startTime || null,
          hours: hours ? parseInt(hours) : null,
          package_name: selectedPackage || null,
          total_price: totalCents,
          deposit_amount: depositCents,
          internal_notes: musicNotes.trim() || null,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // 3. Send agreement email
      await sendEmail('agreement', bookingData.id);

      // 4. Show success
      setQuickBookSuccessEmail(email.trim());
      onSuccess();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (inquirySuccessLink) {
      await navigator.clipboard.writeText(inquirySuccessLink);
    }
  }

  const inputStyle = {
    width: '100%',
    background: '#1a1a26',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '10px 12px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  } as React.CSSProperties;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-2xl"
        style={{
          background: '#12121a',
          border: '1px solid rgba(255,255,255,0.1)',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 pb-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <h2
            className="text-lg font-bold"
            style={{ fontFamily: 'Orbitron, sans-serif', color: '#ffffff' }}
          >
            Add New Client
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '18px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Success states */}
        {inquirySuccessLink ? (
          <div className="p-5 flex flex-col gap-4">
            <div
              className="rounded-xl p-4 text-center"
              style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)' }}
            >
              <div className="text-3xl mb-2">✓</div>
              <p className="font-semibold text-sm" style={{ color: '#818cf8' }}>
                Client added &amp; inquiry sent!
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Client Form Link
              </p>
              <div
                className="rounded-lg p-3 flex items-center gap-2 break-all"
                style={{ background: '#1a1a26', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <span className="text-xs flex-1" style={{ color: '#3b82f6', wordBreak: 'break-all' }}>
                  {inquirySuccessLink}
                </span>
                <button
                  onClick={copyLink}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: '#3b82f6', color: '#fff' }}
                >
                  Copy
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Share this link with your client to collect event details.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-semibold text-sm"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}
            >
              Close
            </button>
          </div>
        ) : quickBookSuccessEmail ? (
          <div className="p-5 flex flex-col gap-4">
            <div
              className="rounded-xl p-4 text-center"
              style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)' }}
            >
              <div className="text-3xl mb-2">✍️</div>
              <p className="font-bold text-base mb-1" style={{ color: '#818cf8' }}>
                Agreement sent!
              </p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Agreement sent to <span style={{ color: '#a78bfa' }}>{quickBookSuccessEmail}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-semibold text-sm"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Mode Toggle */}
            <div className="px-5 pt-4 pb-2">
              <div
                className="flex gap-1 p-1 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <button
                  type="button"
                  onClick={() => { setMode('quick_book'); setError(''); }}
                  className="flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: mode === 'quick_book'
                      ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                      : 'transparent',
                    color: mode === 'quick_book' ? '#fff' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  Quick Book
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('inquiry'); setError(''); }}
                  className="flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: mode === 'inquiry'
                      ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                      : 'transparent',
                    color: mode === 'inquiry' ? '#fff' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  Send Inquiry Form
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {mode === 'quick_book'
                  ? 'For clients who\'ve already discussed details — send the signing link directly.'
                  : 'For cold leads — send a form for the client to fill out event details.'}
              </p>
            </div>

            {/* ========== INQUIRY FORM ========== */}
            {mode === 'inquiry' && (
              <form onSubmit={handleInquirySubmit} className="p-5 pt-3 flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Client's full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Email <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Phone <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 000-0000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Internal Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Referral source, context, etc."
                    rows={3}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {error && (
                  <div
                    className="rounded-lg p-3 text-sm"
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      color: '#ef4444',
                    }}
                  >
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm"
                    style={{
                      background: loading
                        ? 'rgba(59,130,246,0.5)'
                        : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      color: '#fff',
                    }}
                  >
                    {loading ? 'Adding...' : 'Add Client & Send Invite'}
                  </button>
                </div>
              </form>
            )}

            {/* ========== QUICK BOOK FORM ========== */}
            {mode === 'quick_book' && (
              <form onSubmit={handleQuickBookSubmit} className="p-5 pt-3 flex flex-col gap-5">
                {/* Client Info */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Orbitron, sans-serif', fontSize: '10px' }}>
                    Client Info
                  </p>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        Full Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Client's full name"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                          Email <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="client@email.com"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                          Phone <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="(555) 000-0000"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        Internal Notes
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Referral source, context, etc."
                        rows={2}
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Event Details */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Orbitron, sans-serif', fontSize: '10px' }}>
                    Event Details
                  </p>
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                          Event Date <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="date"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                          Event Type
                        </label>
                        <select
                          value={eventType}
                          onChange={(e) => setEventType(e.target.value)}
                          style={inputStyle}
                        >
                          <option value="">Select type...</option>
                          {EVENT_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        Venue
                      </label>
                      <input
                        type="text"
                        value={venue}
                        onChange={(e) => setVenue(e.target.value)}
                        placeholder="Venue name or address"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                          Guests
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={guestCount}
                          onChange={(e) => setGuestCount(e.target.value)}
                          placeholder="50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                          Hours
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={hours}
                          onChange={(e) => setHours(e.target.value)}
                          placeholder="3"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Orbitron, sans-serif', fontSize: '10px' }}>
                    Pricing
                  </p>
                  <div className="flex flex-col gap-3">
                    {/* Package selector */}
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        Package
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {PACKAGES.map((pkg) => (
                          <button
                            key={pkg.name}
                            type="button"
                            onClick={() => handlePackageSelect(pkg.name)}
                            className="py-2.5 px-3 rounded-xl text-sm font-semibold text-left transition-all"
                            style={{
                              background: selectedPackage === pkg.name ? 'rgba(99,102,241,0.15)' : '#1a1a26',
                              border: selectedPackage === pkg.name ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.08)',
                              color: selectedPackage === pkg.name ? '#818cf8' : 'rgba(255,255,255,0.7)',
                            }}
                          >
                            <div>{pkg.name}</div>
                            {pkg.price > 0 && (
                              <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                ${pkg.price}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                          Total Price ($) <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={totalPrice}
                          onChange={(e) => setTotalPrice(e.target.value)}
                          placeholder="275.00"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                          Deposit ($) <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          placeholder="137.50"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        Music / Vibe Notes
                      </label>
                      <textarea
                        value={musicNotes}
                        onChange={(e) => setMusicNotes(e.target.value)}
                        placeholder="Genre preferences, must-play songs, vibes..."
                        rows={2}
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div
                    className="rounded-lg p-3 text-sm"
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      color: '#ef4444',
                    }}
                  >
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm"
                    style={{
                      background: loading
                        ? 'rgba(59,130,246,0.5)'
                        : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      color: '#fff',
                    }}
                  >
                    {loading ? 'Booking...' : 'Book & Send Agreement'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
