import { useState } from 'react';
import { supabase } from '../supabase';
import { sendEmail } from '../lib/email';

interface AddClientModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddClientModal({ onClose, onSuccess }: AddClientModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successLink, setSuccessLink] = useState('');

  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;

  async function handleSubmit(e: React.FormEvent) {
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
      setSuccessLink(link);
      onSuccess();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (successLink) {
      await navigator.clipboard.writeText(successLink);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl"
        style={{
          background: '#12121a',
          border: '1px solid rgba(255,255,255,0.1)',
          maxHeight: '90vh',
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

        {successLink ? (
          /* Success state */
          <div className="p-5 flex flex-col gap-4">
            <div
              className="rounded-xl p-4 text-center"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}
            >
              <div className="text-3xl mb-2">✓</div>
              <p className="font-semibold text-sm" style={{ color: '#22c55e' }}>
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
                  {successLink}
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
        ) : (
          /* Form state */
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
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
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
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
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
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
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
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
      </div>
    </div>
  );
}
