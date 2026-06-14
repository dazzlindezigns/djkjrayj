import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { supabase } from '../supabase';
import type { Booking, Package } from '../types';
import StatusBadge from '../components/StatusBadge';
import StepTimeline from '../components/StepTimeline';
import { sendEmail } from '../lib/email';
import { downloadICS } from '../lib/ics';

const CUSTOM_PKG = { name: 'Custom', price: 0 };

const EVENT_TYPES = [
  'Birthday Party', 'Quinceañera', 'Sweet 16', 'Wedding', 'School Dance',
  'Graduation Party', 'Corporate Event', 'Block Party', 'House Party', 'Other',
];

function formatCents(cents?: number | null): string {
  if (cents == null) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try { return format(parseISO(dateStr), 'EEEE, MMMM d, yyyy'); }
  catch { return dateStr; }
}

function Section({
  title, children, action,
}: {
  title: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center justify-between mb-4">
        <h2
          className="font-bold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Orbitron, sans-serif', fontSize: '10px' }}
        >
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
        {label}
      </span>
      <p className="font-semibold mt-0.5" style={{ color: value ? '#ffffff' : 'rgba(255,255,255,0.25)' }}>
        {value || '—'}
      </p>
    </div>
  );
}

function EditBtn({ onClick, active }: { onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-lg text-xs font-semibold"
      style={{
        background: active ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.06)',
        border: active ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.08)',
        color: active ? '#60a5fa' : 'rgba(255,255,255,0.45)',
      }}
    >
      {active ? 'Cancel' : 'Edit'}
    </button>
  );
}

function LabeledInput({
  label, type = 'text', value, onChange, placeholder, min, max, step, children,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; min?: string; max?: string; step?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {label}
      </label>
      {children ?? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          style={type === 'date' || type === 'time' ? { colorScheme: 'dark' } : undefined}
        />
      )}
    </div>
  );
}

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [balanceReminderSent, setBalanceReminderSent] = useState(false);
  const [surveySent, setSurveySent] = useState(false);

  const [packages, setPackages] = useState<{ name: string; price: number }[]>([CUSTOM_PKG]);

  useEffect(() => {
    supabase.from('packages').select('name,price').order('sort_order').then(({ data }) => {
      if (data?.length) setPackages([...(data as Pick<Package, 'name' | 'price'>[]), CUSTOM_PKG]);
    });
  }, []);

  // Edit toggles
  const [editingClient, setEditingClient] = useState(false);
  const [editingEvent, setEditingEvent] = useState(false);
  const [editingPricing, setEditingPricing] = useState(false);

  // Client edit fields
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Event edit fields
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState('');
  const [eventVenue, setEventVenue] = useState('');
  const [guestCount, setGuestCount] = useState('');

  // Pricing form state (used for both initial confirm and edit)
  const [selectedPackage, setSelectedPackage] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  const [discountMode, setDiscountMode] = useState<'$' | '%'>('$');
  const [hours, setHours] = useState('');
  const [startTime, setStartTime] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [customTerms, setCustomTerms] = useState('');

  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;

  const loadBooking = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from('bookings')
      .select('*, clients(*)')
      .eq('id', id)
      .single();

    if (err) { setError('Booking not found.'); setLoading(false); return; }

    const b = data as Booking;
    setBooking(b);

    // Pricing
    setSelectedPackage(b.package_name ?? '');
    setTotalPrice(b.total_price != null ? String(b.total_price / 100) : '');
    setDepositAmount(b.deposit_amount != null ? String(b.deposit_amount / 100) : '');
    setDiscountInput(b.discount_amount_off ? String(b.discount_amount_off / 100) : '');
    setHours(b.hours != null ? String(b.hours) : '');
    setStartTime(b.start_time ?? '');

    // Client
    setClientName(b.clients?.name ?? '');
    setClientEmail(b.clients?.email ?? '');
    setClientPhone(b.clients?.phone ?? '');

    // Event
    setEventDate(b.event_date ?? '');
    setEventType(b.event_type ?? '');
    setEventVenue(b.venue ?? '');
    setGuestCount(b.guest_count != null ? String(b.guest_count) : '');

    // Notes & terms
    setInternalNotes(b.internal_notes ?? '');
    setCustomTerms(b.custom_terms ?? '');

    setLoading(false);
  }, [id]);

  useEffect(() => { loadBooking(); }, [loadBooking]);

  function computeDiscountCents(input: string, mode: '$' | '%', totalCents: number): number {
    if (!input || isNaN(parseFloat(input))) return 0;
    const val = parseFloat(input);
    return mode === '%' ? Math.round((val / 100) * totalCents) : Math.round(val * 100);
  }

  function handlePackageSelect(pkgName: string) {
    setSelectedPackage(pkgName);
    const pkg = packages.find((p) => p.name === pkgName);
    if (pkg && pkg.price > 0) {
      setTotalPrice(String(pkg.price / 100));
      setDepositAmount(String(pkg.price / 100 / 2));
    }
  }

  function showSuccess(msg: string) {
    setError('');
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  }

  // ── Client ──
  async function handleSaveClient() {
    if (!booking?.clients) return;
    setSaving(true);
    setError('');
    const { error: err } = await supabase
      .from('clients')
      .update({ name: clientName.trim(), email: clientEmail.trim(), phone: clientPhone.trim() })
      .eq('id', booking.clients.id);
    if (err) { setError(err.message); setSaving(false); return; }
    setEditingClient(false);
    showSuccess('Client info updated.');
    loadBooking();
    setSaving(false);
  }

  // ── Event Details ──
  async function handleSaveEvent() {
    if (!booking) return;
    setSaving(true);
    setError('');
    const { error: err } = await supabase
      .from('bookings')
      .update({
        event_date: eventDate || null,
        event_type: eventType || null,
        venue: eventVenue || null,
        guest_count: guestCount ? parseInt(guestCount) : null,
      })
      .eq('id', booking.id);
    if (err) { setError(err.message); setSaving(false); return; }
    setEditingEvent(false);
    showSuccess('Event details updated.');
    loadBooking();
    setSaving(false);
  }

  // ── Pricing (initial confirm) ──
  async function handleConfirm() {
    if (!booking) return;
    if (!totalPrice || !depositAmount) { setError('Please enter total price and deposit amount.'); return; }
    setSaving(true);
    setError('');
    const totalCents = Math.round(parseFloat(totalPrice) * 100);
    const depositCents = Math.round(parseFloat(depositAmount) * 100);
    const discountCents = computeDiscountCents(discountInput, discountMode, totalCents);
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'agreement_sent',
        package_name: selectedPackage || null,
        total_price: totalCents,
        deposit_amount: depositCents,
        ...(discountCents > 0 ? { discount_amount_off: discountCents } : {}),
        hours: hours ? parseInt(hours) : null,
        start_time: startTime || null,
        internal_notes: internalNotes || null,
      })
      .eq('id', booking.id);
    if (updateError) { setError(updateError.message); setSaving(false); return; }
    await sendEmail('agreement', booking.id);
    showSuccess('Booking confirmed and agreement sent to client!');
    loadBooking();
    setSaving(false);
  }

  // ── Pricing (edit after confirmed) ──
  async function handleSavePricing(resend = false) {
    if (!booking) return;
    if (!totalPrice || !depositAmount) { setError('Price and deposit are required.'); return; }
    setSaving(true);
    setError('');
    const totalCents = Math.round(parseFloat(totalPrice) * 100);
    const depositCents = Math.round(parseFloat(depositAmount) * 100);
    const discountCents = computeDiscountCents(discountInput, discountMode, totalCents);
    const { error: err } = await supabase
      .from('bookings')
      .update({
        package_name: selectedPackage || null,
        total_price: totalCents,
        deposit_amount: depositCents,
        ...(discountCents > 0 ? { discount_amount_off: discountCents } : {}),
        hours: hours ? parseInt(hours) : null,
        start_time: startTime || null,
      })
      .eq('id', booking.id);
    if (err) { setError(err.message); setSaving(false); return; }
    if (resend) {
      await sendEmail('agreement', booking.id);
      showSuccess('Pricing updated and agreement resent!');
    } else {
      showSuccess('Pricing updated.');
    }
    setEditingPricing(false);
    loadBooking();
    setSaving(false);
  }

  // ── Custom Terms ──
  async function handleSaveCustomTerms() {
    if (!booking) return;
    setSaving(true);
    setError('');
    const { error: err } = await supabase
      .from('bookings')
      .update({ custom_terms: customTerms.trim() || null } as Record<string, unknown>)
      .eq('id', booking.id);
    if (err) { setError(err.message); } else { showSuccess('Custom terms saved.'); }
    setSaving(false);
  }

  // ── Deposit ──
  async function handleMarkDepositPaid() {
    if (!booking) return;
    setSaving(true);
    setError('');
    const { error: updateError } = await supabase
      .from('bookings').update({ status: 'deposit_paid' }).eq('id', booking.id);
    if (updateError) { setError(updateError.message); setSaving(false); return; }
    const emailType = booking.status === 'signed' ? 'confirmed' : 'deposit_before_sign';
    await sendEmail(emailType, booking.id);
    showSuccess('Deposit marked as received!');
    loadBooking();
    setSaving(false);
  }

  async function handleMarkCompleted() {
    if (!booking) return;
    setSaving(true);
    await supabase.from('bookings').update({ status: 'completed' }).eq('id', booking.id);
    loadBooking();
    setSaving(false);
  }

  async function handleCancel() {
    if (!booking) return;
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    setSaving(true);
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);
    loadBooking();
    setSaving(false);
  }

  async function handleSaveNotes() {
    if (!booking) return;
    setSaving(true);
    await supabase.from('bookings').update({ internal_notes: internalNotes }).eq('id', booking.id);
    showSuccess('Notes saved.');
    setSaving(false);
  }

  async function handleResendAgreement() {
    if (!booking) return;
    setSaving(true);
    await sendEmail('agreement', booking.id);
    showSuccess('Agreement resent to client!');
    setSaving(false);
  }

  async function handleSendSurvey() {
    if (!booking) return;
    setSaving(true);
    await sendEmail('survey', booking.id);
    setSurveySent(true);
    setSaving(false);
  }

  async function handleSendBalanceReminder() {
    if (!booking) return;
    setSaving(true);
    setError('');
    try {
      await sendEmail('balance_reminder', booking.id);
      setBalanceReminderSent(true);
    } catch (err) {
      console.error(err);
      setError('Failed to send balance reminder.');
    } finally {
      setSaving(false);
    }
  }

  async function copyInquiryLink() {
    if (!booking) return;
    await navigator.clipboard.writeText(`${appUrl}/book/${booking.inquiry_token}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  async function copySigningLink() {
    if (!booking) return;
    await navigator.clipboard.writeText(`${appUrl}/sign/${booking.id}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#3b82f6' }} />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#0a0a0f' }}>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Booking not found.</p>
        <button onClick={() => navigate('/dashboard')} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: '#3b82f6', color: '#fff' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const client = booking.clients;
  const inquiryLink = `${appUrl}/book/${booking.inquiry_token}`;
  const signingLink = `${appUrl}/sign/${booking.id}`;
  const canConfirm = booking.status === 'inquiry_submitted';
  const canMarkDeposit = !['deposit_paid', 'completed', 'cancelled'].includes(booking.status) && booking.deposit_amount != null;
  const canMarkComplete = booking.status === 'deposit_paid';
  const hasEventDate = !!booking.event_date;
  const canResendAgreement = ['agreement_sent', 'confirmed', 'signed'].includes(booking.status);
  const canEditPricing = !['cancelled'].includes(booking.status) && !canConfirm && booking.total_price != null;

  // Computed balance
  const totalCents = booking.total_price ?? 0;
  const depositCents = booking.deposit_amount ?? 0;
  const discountCents = booking.discount_amount_off ?? 0;
  const balanceDueCents = totalCents - depositCents - discountCents;

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f', fontFamily: 'Rajdhani, sans-serif' }}>
      <div className="max-w-2xl mx-auto px-4 pb-10">

        {/* Header */}
        <div className="flex items-center gap-3 py-5">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm font-semibold rounded-xl px-3 py-2"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Dashboard
          </button>
          <div className="flex-1" />
          <StatusBadge status={booking.status} />
        </div>

        {/* Messages */}
        {successMsg && (
          <div className="mb-4 rounded-xl p-3 text-sm font-semibold" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }}>
            {successMsg}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl p-3 text-sm font-semibold" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">

          {/* ── Client ── */}
          <Section title="Client" action={<EditBtn onClick={() => setEditingClient(!editingClient)} active={editingClient} />}>
            {editingClient ? (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 gap-3">
                  <LabeledInput label="Name" value={clientName} onChange={setClientName} placeholder="Full name" />
                  <LabeledInput label="Email" type="email" value={clientEmail} onChange={setClientEmail} placeholder="email@example.com" />
                  <LabeledInput label="Phone" type="tel" value={clientPhone} onChange={setClientPhone} placeholder="(512) 555-1234" />
                </div>
                <button
                  onClick={handleSaveClient}
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff' }}
                >
                  {saving ? 'Saving…' : 'Save Client Info'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Field label="Name" value={client?.name} /></div>
                <Field label="Email" value={client?.email} />
                <Field label="Phone" value={client?.phone} />
                {client?.notes && <div className="col-span-2"><Field label="Notes" value={client.notes} /></div>}
              </div>
            )}
          </Section>

          {/* ── Event Details ── */}
          <Section
            title="Event Details"
            action={booking.status !== 'inquiry_sent' ? <EditBtn onClick={() => setEditingEvent(!editingEvent)} active={editingEvent} /> : undefined}
          >
            {booking.status === 'inquiry_sent' ? (
              <div>
                <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Awaiting client response. Share this link with them:
                </p>
                <div className="flex items-center gap-2 rounded-xl p-3" style={{ background: '#1a1a26', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="text-xs flex-1 truncate" style={{ color: '#3b82f6' }}>{inquiryLink}</span>
                  <button onClick={copyInquiryLink} className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0" style={{ background: '#3b82f6', color: '#fff' }}>
                    {copiedLink ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            ) : editingEvent ? (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <LabeledInput label="Event Date" type="date" value={eventDate} onChange={setEventDate} />
                  </div>
                  <LabeledInput label="Event Type" value={eventType} onChange={setEventType}>
                    <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
                      <option value="">Select type…</option>
                      {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </LabeledInput>
                  <LabeledInput label="Guest Count" type="number" value={guestCount} onChange={setGuestCount} placeholder="e.g. 50" min="1" />
                  <div className="col-span-2">
                    <LabeledInput label="Venue / Location" value={eventVenue} onChange={setEventVenue} placeholder="Venue name or address" />
                  </div>
                </div>
                <button
                  onClick={handleSaveEvent}
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff' }}
                >
                  {saving ? 'Saving…' : 'Save Event Details'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Field label="Event Date" value={formatDate(booking.event_date)} /></div>
                <Field label="Event Type" value={booking.event_type} />
                <Field label="Guest Count" value={booking.guest_count?.toString()} />
                <div className="col-span-2"><Field label="Venue" value={booking.venue} /></div>
                <Field label="Start Time" value={booking.start_time} />
                <Field label="Duration" value={booking.hours ? `${booking.hours} hrs` : undefined} />
              </div>
            )}
          </Section>

          {/* ── Pricing & Confirmation — initial confirm ── */}
          {canConfirm && (
            <Section title="Pricing & Confirmation">
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Package</label>
                  <div className="grid grid-cols-2 gap-2">
                    {packages.map((pkg) => (
                      <button
                        key={pkg.name}
                        type="button"
                        onClick={() => handlePackageSelect(pkg.name)}
                        className="py-3 px-3 rounded-xl text-sm font-semibold text-left transition-all"
                        style={{
                          background: selectedPackage === pkg.name ? 'rgba(59,130,246,0.15)' : '#1a1a26',
                          border: selectedPackage === pkg.name ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                          color: selectedPackage === pkg.name ? '#3b82f6' : 'rgba(255,255,255,0.7)',
                        }}
                      >
                        <div>{pkg.name}</div>
                        {pkg.price > 0 && <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>${(pkg.price / 100).toFixed(0)}</div>}
                      </button>
                    ))}
                  </div>
                </div>

                <PricingFields
                  totalPrice={totalPrice} setTotalPrice={setTotalPrice}
                  depositAmount={depositAmount} setDepositAmount={setDepositAmount}
                  hours={hours} setHours={setHours}
                  startTime={startTime} setStartTime={setStartTime}
                  discountInput={discountInput} setDiscountInput={setDiscountInput}
                  discountMode={discountMode} setDiscountMode={setDiscountMode}
                />

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Internal Notes</label>
                  <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Any internal notes…" rows={2} style={{ resize: 'vertical' }} />
                </div>

                <button
                  onClick={handleConfirm}
                  disabled={saving}
                  className="w-full py-3.5 rounded-xl font-bold text-sm"
                  style={{ background: saving ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff' }}
                >
                  {saving ? 'Sending…' : 'Confirm Booking & Send Agreement'}
                </button>
              </div>
            </Section>
          )}

          {/* ── Pricing display / edit (after confirmed) ── */}
          {canEditPricing && (
            <Section
              title="Pricing"
              action={<EditBtn onClick={() => setEditingPricing(!editingPricing)} active={editingPricing} />}
            >
              {editingPricing ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Package</label>
                    <div className="grid grid-cols-2 gap-2">
                      {packages.map((pkg) => (
                        <button
                          key={pkg.name}
                          type="button"
                          onClick={() => handlePackageSelect(pkg.name)}
                          className="py-2.5 px-3 rounded-xl text-sm font-semibold text-left transition-all"
                          style={{
                            background: selectedPackage === pkg.name ? 'rgba(59,130,246,0.15)' : '#1a1a26',
                            border: selectedPackage === pkg.name ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                            color: selectedPackage === pkg.name ? '#3b82f6' : 'rgba(255,255,255,0.7)',
                          }}
                        >
                          <div>{pkg.name}</div>
                          {pkg.price > 0 && <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>${(pkg.price / 100).toFixed(0)}</div>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <PricingFields
                    totalPrice={totalPrice} setTotalPrice={setTotalPrice}
                    depositAmount={depositAmount} setDepositAmount={setDepositAmount}
                    hours={hours} setHours={setHours}
                    startTime={startTime} setStartTime={setStartTime}
                    discountInput={discountInput} setDiscountInput={setDiscountInput}
                    discountMode={discountMode} setDiscountMode={setDiscountMode}
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSavePricing(false)}
                      disabled={saving}
                      className="flex-1 py-2.5 rounded-xl font-bold text-sm"
                      style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa' }}
                    >
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    {canResendAgreement && (
                      <button
                        onClick={() => handleSavePricing(true)}
                        disabled={saving}
                        className="flex-1 py-2.5 rounded-xl font-bold text-sm"
                        style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff' }}
                      >
                        {saving ? 'Sending…' : 'Save & Resend Agreement'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    {booking.package_name && (
                      <div className="col-span-3"><Field label="Package" value={booking.package_name} /></div>
                    )}
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Total</span>
                      <p className="font-bold text-xl mt-0.5" style={{ color: '#818cf8' }}>{formatCents(booking.total_price)}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Deposit</span>
                      <p className="font-bold text-xl mt-0.5" style={{ color: '#a78bfa' }}>{formatCents(booking.deposit_amount)}</p>
                    </div>
                    {booking.hours && (
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Hours</span>
                        <p className="font-bold text-xl mt-0.5" style={{ color: '#ffffff' }}>{booking.hours}h</p>
                      </div>
                    )}
                    {discountCents > 0 && (
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Discount</span>
                        <p className="font-bold text-xl mt-0.5" style={{ color: '#34d399' }}>−{formatCents(discountCents)}</p>
                      </div>
                    )}
                    {booking.total_price != null && booking.deposit_amount != null && (
                      <div className="col-span-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          {booking.status === 'deposit_paid' || booking.status === 'completed' ? 'Balance (due on event day)' : 'Balance Due'}
                        </span>
                        <p className="font-bold text-2xl mt-0.5" style={{ color: '#60a5fa' }}>{formatCents(balanceDueCents)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* ── Agreement / Signing ── */}
          {['agreement_sent', 'confirmed'].includes(booking.status) && (
            <Section title="Agreement">
              <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Agreement sent. Share the signing link or resend the email:
              </p>
              <div className="flex items-center gap-2 rounded-xl p-3 mb-3" style={{ background: '#1a1a26', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-xs flex-1 truncate" style={{ color: '#3b82f6' }}>{signingLink}</span>
                <button onClick={copySigningLink} className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0" style={{ background: '#3b82f6', color: '#fff' }}>
                  {copiedLink ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <button
                onClick={handleResendAgreement}
                disabled={saving}
                className="w-full py-2.5 rounded-xl font-semibold text-sm mb-4"
                style={{ background: 'transparent', border: '1px solid rgba(99,102,241,0.4)', color: '#a78bfa' }}
              >
                {saving ? 'Sending…' : 'Resend Agreement Email'}
              </button>
              <CustomTermsEditor
                value={customTerms}
                onChange={setCustomTerms}
                onSave={handleSaveCustomTerms}
                saving={saving}
              />
            </Section>
          )}

          {booking.status === 'deposit_paid' && !booking.client_signature && (
            <Section title="Agreement">
              <div className="flex items-center gap-2 mb-3 rounded-xl p-3" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
                <span style={{ color: '#fbbf24', fontSize: 18 }}>⚠️</span>
                <span className="text-sm font-semibold" style={{ color: '#fbbf24' }}>Agreement not yet signed</span>
              </div>
              <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Deposit received but the client hasn't signed. Share the signing link:
              </p>
              <div className="flex items-center gap-2 rounded-xl p-3" style={{ background: '#1a1a26', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-xs flex-1 truncate" style={{ color: '#3b82f6' }}>{signingLink}</span>
                <button onClick={copySigningLink} className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0" style={{ background: '#3b82f6', color: '#fff' }}>
                  {copiedLink ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </Section>
          )}

          {booking.status === 'signed' && (
            <Section title="Agreement">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#818cf8' }}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="font-semibold text-sm" style={{ color: '#818cf8' }}>Agreement Signed</span>
              </div>
              {booking.signed_at && (
                <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Signed on {format(parseISO(booking.signed_at), 'PPpp')}
                </p>
              )}
              {booking.client_signature && (
                <p className="text-sm italic" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Signed as: "{booking.client_signature}"
                </p>
              )}
            </Section>
          )}

          {/* ── Deposit ── */}
          {canMarkDeposit && (
            <Section title="Deposit">
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {booking.status === 'signed'
                  ? <>Agreement signed! Waiting for deposit of <span style={{ color: '#a78bfa', fontWeight: 600 }}>{formatCents(booking.deposit_amount)}</span> via CashApp.</>
                  : <>Mark deposit as received. Client will be sent a reminder to sign the agreement.</>
                }
              </p>
              <button
                onClick={handleMarkDepositPaid}
                disabled={saving}
                className="w-full py-3 rounded-xl font-bold text-sm mb-3"
                style={{ background: saving ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff' }}
              >
                {saving ? 'Saving…' : 'Mark Deposit Received'}
              </button>
              {hasEventDate && (
                <button
                  onClick={handleSendBalanceReminder}
                  disabled={saving || balanceReminderSent}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm"
                  style={{ background: 'transparent', border: balanceReminderSent ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(99,102,241,0.5)', color: balanceReminderSent ? '#818cf8' : '#a78bfa' }}
                >
                  {balanceReminderSent ? 'Reminder Sent ✓' : 'Send Balance Reminder'}
                </button>
              )}
            </Section>
          )}

          {booking.status === 'deposit_paid' && (
            <Section title="Deposit">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#818cf8' }}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="font-semibold text-sm" style={{ color: '#818cf8' }}>
                  Deposit Received — {formatCents(booking.deposit_amount)}
                </span>
              </div>
              {hasEventDate && (
                <button
                  onClick={handleSendBalanceReminder}
                  disabled={saving || balanceReminderSent}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm"
                  style={{ background: 'transparent', border: balanceReminderSent ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(99,102,241,0.5)', color: balanceReminderSent ? '#818cf8' : '#a78bfa' }}
                >
                  {balanceReminderSent ? 'Reminder Sent ✓' : 'Send Balance Reminder'}
                </button>
              )}
            </Section>
          )}

          {/* ── Calendar ── */}
          {hasEventDate && client && (
            <button
              onClick={() => downloadICS(booking, client)}
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
              style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Add to Calendar (.ics)
            </button>
          )}

          {/* ── Internal Notes ── */}
          {!canConfirm && (
            <Section title="Internal Notes">
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Private notes (not visible to client)…"
                rows={3}
                style={{ resize: 'vertical' }}
              />
              <button
                onClick={handleSaveNotes}
                disabled={saving}
                className="mt-3 px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
              >
                Save Notes
              </button>
            </Section>
          )}

          {/* ── Action Buttons ── */}
          <div className="flex gap-3">
            {canMarkComplete && (
              <button
                onClick={handleMarkCompleted}
                disabled={saving}
                className="flex-1 py-3 rounded-xl font-bold text-sm"
                style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6' }}
              >
                Mark Completed
              </button>
            )}
            {!['completed', 'cancelled'].includes(booking.status) && (
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-3 rounded-xl font-bold text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
              >
                Cancel
              </button>
            )}
          </div>

          {/* ── Post-Event Survey ── */}
          {booking.status === 'completed' && (
            <Section title="Post-Event Survey">
              <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Send the client a survey to rate their booking experience and DJ KJ's performance.
              </p>
              <button
                onClick={handleSendSurvey}
                disabled={saving || surveySent}
                className="w-full py-2.5 rounded-xl font-semibold text-sm"
                style={{ background: 'transparent', border: surveySent ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(99,102,241,0.5)', color: surveySent ? '#818cf8' : '#a78bfa' }}
              >
                {surveySent ? 'Survey Sent ✓' : 'Send Post-Event Survey'}
              </button>
            </Section>
          )}

          {/* ── Status Timeline ── */}
          <Section title="Booking Progress">
            <StepTimeline status={booking.status} isSigned={!!booking.client_signature} />
          </Section>

        </div>
      </div>
    </div>
  );
}

/* ── Shared Pricing Fields sub-component ── */
function PricingFields({
  totalPrice, setTotalPrice,
  depositAmount, setDepositAmount,
  hours, setHours,
  startTime, setStartTime,
  discountInput, setDiscountInput,
  discountMode, setDiscountMode,
}: {
  totalPrice: string; setTotalPrice: (v: string) => void;
  depositAmount: string; setDepositAmount: (v: string) => void;
  hours: string; setHours: (v: string) => void;
  startTime: string; setStartTime: (v: string) => void;
  discountInput: string; setDiscountInput: (v: string) => void;
  discountMode: '$' | '%'; setDiscountMode: (v: '$' | '%') => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Total Price ($)</label>
        <input type="number" min="0" step="0.01" value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} placeholder="e.g. 275.00" />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Deposit ($)</label>
        <input type="number" min="0" step="0.01" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="e.g. 137.50" />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Hours</label>
        <input type="number" min="1" max="12" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="e.g. 3" />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Start Time</label>
        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ colorScheme: 'dark' }} />
      </div>
      <div className="col-span-2">
        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Discount (optional)</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDiscountMode(discountMode === '$' ? '%' : '$')}
            className="flex-shrink-0 px-3 rounded-lg text-sm font-bold"
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)', color: '#a78bfa' }}
          >
            {discountMode}
          </button>
          <input
            type="number" min="0" step="0.01"
            value={discountInput} onChange={(e) => setDiscountInput(e.target.value)}
            placeholder={discountMode === '$' ? 'e.g. 25.00' : 'e.g. 10'}
            style={{ flex: 1 }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Custom Terms editor ── */
function CustomTermsEditor({
  value, onChange, onSave, saving,
}: {
  value: string; onChange: (v: string) => void; onSave: () => void; saving: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
        Custom Terms / Addendum
      </label>
      <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
        Any additional terms will be appended to the standard contract terms.
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. DJ KJ will receive a 15% friend discount. Client agrees to provide dinner for performer…"
        rows={3}
        style={{ resize: 'vertical' }}
      />
      <button
        onClick={onSave}
        disabled={saving}
        className="mt-2 px-4 py-2 rounded-lg text-sm font-semibold"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
      >
        {saving ? 'Saving…' : 'Save Terms'}
      </button>
    </div>
  );
}
