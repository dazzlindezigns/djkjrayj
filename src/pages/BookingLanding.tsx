import { useState, useRef, FormEvent, useEffect } from 'react';
import { supabase } from '../supabase';
import type { Package } from '../types';

interface PackageInfo {
  name: string;
  price: string;
  description: string;
  tagline: string;
  popular: boolean;
  inclusions: string[];
  formValue: string;
}

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
  { value: 'Starter Set ($150)', label: 'Starter Set ($150)' },
  { value: 'The Vibe ($275)', label: 'The Vibe ($275)' },
  { value: 'Full Send ($400)', label: 'Full Send ($400)' },
  { value: 'Not Sure Yet', label: 'Not Sure Yet' },
];

interface FormData {
  name: string;
  email: string;
  phone: string;
  event_type: string;
  event_date: string;
  venue: string;
  guest_count: string;
  package_preference: string;
  start_time: string;
  music_notes: string;
  special_requests: string;
}

const EMPTY_FORM: FormData = {
  name: '',
  email: '',
  phone: '',
  event_type: '',
  event_date: '',
  venue: '',
  guest_count: '',
  package_preference: '',
  start_time: '',
  music_notes: '',
  special_requests: '',
};

function pkgToInfo(pkg: Package): PackageInfo {
  return {
    name: pkg.name,
    price: `$${(pkg.price / 100).toFixed(0)}`,
    description: pkg.duration,
    tagline: pkg.tagline,
    popular: pkg.popular,
    inclusions: pkg.inclusions,
    formValue: `${pkg.name} ($${(pkg.price / 100).toFixed(0)})`,
  };
}

export default function BookingLanding() {
  const formRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<PackageInfo | null>(null);
  const [packageData, setPackageData] = useState<PackageInfo[]>([]);

  useEffect(() => {
    supabase
      .from('packages')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        if (data) setPackageData((data as Package[]).map(pkgToInfo));
      });
  }, []);

  useEffect(() => {
    if (selectedPackage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedPackage]);

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function bookPackage(pkg: PackageInfo) {
    setSelectedPackage(null);
    setForm((prev) => ({ ...prev, package_preference: pkg.formValue }));
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/submit-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          guest_count: form.guest_count ? Number(form.guest_count) : undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || 'Something went wrong. Please try again.');
      } else {
        setSubmitted(true);
      }
    } catch (_err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: '#0a0a0f',
        minHeight: '100vh',
        color: '#ffffff',
        fontFamily: 'Rajdhani, sans-serif',
        fontWeight: 500,
        scrollBehavior: 'smooth',
        overflowX: 'hidden',
      }}
    >
      {/* ── Hero ── */}
      <section
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '3rem 1.5rem',
          overflow: 'hidden',
        }}
      >
        {/* Radial glow background */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '-10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '700px',
            height: '700px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(59,130,246,0.1) 40%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '680px', margin: '0 auto' }}>
          {/* Logo */}
          <div
            style={{
              width: 180,
              height: 180,
              margin: '0 auto 2rem',
              borderRadius: '50%',
              padding: '6px',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              boxShadow: '0 0 48px rgba(139,92,246,0.4), 0 0 80px rgba(59,130,246,0.2)',
            }}
          >
            <img
              src="/icons/icon-512.png"
              alt="DJ KJ Logo"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>

          {/* Title */}
          <h1
            style={{
              fontFamily: 'Orbitron, sans-serif',
              fontWeight: 900,
              fontSize: 'clamp(3rem, 10vw, 5.5rem)',
              letterSpacing: '0.04em',
              margin: '0 0 0.5rem',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1.1,
            }}
          >
            DJ KJ
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontFamily: 'Orbitron, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(1rem, 3vw, 1.25rem)',
              color: 'rgba(255,255,255,0.9)',
              margin: '0 0 1rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Pflugerville's Premier Teen DJ
          </p>

          {/* Tagline */}
          <p
            style={{
              fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
              color: 'rgba(255,255,255,0.6)',
              margin: '0 0 2.5rem',
              lineHeight: 1.6,
            }}
          >
            Professional DJ services for birthdays, quinceañeras, school dances, and more
          </p>

          {/* CTA */}
          <button
            onClick={scrollToForm}
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '0.9rem 2.4rem',
              fontSize: '1.15rem',
              fontFamily: 'Rajdhani, sans-serif',
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.04em',
              boxShadow: '0 4px 24px rgba(139,92,246,0.35)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(139,92,246,0.5)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 24px rgba(139,92,246,0.35)';
            }}
          >
            Book Your Event →
          </button>
        </div>

        {/* Scroll indicator */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: 0.4,
            animation: 'bounce 2s infinite',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </section>

      {/* ── Packages ── */}
      <section style={{ padding: '5rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
        <h2
          style={{
            fontFamily: 'Orbitron, sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
            textAlign: 'center',
            marginBottom: '0.75rem',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Packages
        </h2>
        <p
          style={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.55)',
            marginBottom: '3rem',
            fontSize: '1.05rem',
          }}
        >
          Simple, transparent pricing — no hidden fees
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {packageData.map((pkg) => (
            <PackageCard
              key={pkg.name}
              name={pkg.name}
              price={pkg.price}
              description={pkg.description}
              tagline={pkg.tagline}
              popular={pkg.popular}
              onClick={() => setSelectedPackage(pkg)}
            />
          ))}
        </div>
      </section>

      {/* ── Booking Form ── */}
      <section
        ref={formRef}
        style={{
          padding: '4rem 1.5rem 6rem',
          maxWidth: '680px',
          margin: '0 auto',
        }}
      >
        <h2
          style={{
            fontFamily: 'Orbitron, sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
            textAlign: 'center',
            marginBottom: '0.75rem',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Request a Booking
        </h2>
        <p
          style={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.55)',
            marginBottom: '2.5rem',
            fontSize: '1.05rem',
          }}
        >
          Fill out the form and DJ KJ will get back to you within 24 hours
        </p>

        <div
          style={{
            background: '#12121a',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: 'clamp(1.5rem, 5vw, 2.5rem)',
          }}
        >
          {submitted ? (
            <ThankYou name={form.name} />
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <Field label="Full Name" required>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    required
                  />
                </Field>

                <Field label="Email" required>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    required
                  />
                </Field>

                <Field label="Phone" required>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="(512) 555-1234"
                    required
                  />
                </Field>

                <Field label="Event Type" required>
                  <select name="event_type" value={form.event_type} onChange={handleChange} required>
                    <option value="">Select event type…</option>
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Event Date">
                  <input
                    type="date"
                    name="event_date"
                    value={form.event_date}
                    onChange={handleChange}
                    style={{ colorScheme: 'dark' }}
                  />
                </Field>

                <Field label="Venue / Location">
                  <input
                    type="text"
                    name="venue"
                    value={form.venue}
                    onChange={handleChange}
                    placeholder="Venue name or address"
                  />
                </Field>

                <Field label="Guest Count">
                  <input
                    type="number"
                    name="guest_count"
                    value={form.guest_count}
                    onChange={handleChange}
                    placeholder="Approx. number of guests"
                    min={1}
                  />
                </Field>

                <Field label="Package Preference">
                  <select name="package_preference" value={form.package_preference} onChange={handleChange}>
                    <option value="">Not sure yet…</option>
                    {PACKAGES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Start Time Preference">
                  <input
                    type="time"
                    name="start_time"
                    value={form.start_time}
                    onChange={handleChange}
                    style={{ colorScheme: 'dark' }}
                  />
                </Field>

                <Field label="Music / Vibe Notes">
                  <textarea
                    name="music_notes"
                    value={form.music_notes}
                    onChange={handleChange}
                    rows={4}
                    placeholder="What's the vibe? Genres, must-play songs, do-not-play list..."
                    style={{ resize: 'vertical' }}
                  />
                </Field>

                <Field label="Special Requests">
                  <textarea
                    name="special_requests"
                    value={form.special_requests}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Anything else we should know?"
                    style={{ resize: 'vertical' }}
                  />
                </Field>

                {error && (
                  <div
                    style={{
                      background: 'rgba(239,68,68,0.12)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 8,
                      padding: '0.75rem 1rem',
                      color: '#f87171',
                      fontSize: '0.95rem',
                    }}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: loading
                      ? 'rgba(139,92,246,0.4)'
                      : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: '1.1rem',
                    fontFamily: 'Rajdhani, sans-serif',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.04em',
                    transition: 'opacity 0.2s ease',
                    marginTop: '0.25rem',
                    boxShadow: loading ? 'none' : '0 4px 20px rgba(139,92,246,0.3)',
                  }}
                >
                  {loading ? 'Sending…' : 'Send Booking Request'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: '3rem 1.5rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <img
          src="/icons/icon-512.png"
          alt="DJ KJ"
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '2px solid rgba(139,92,246,0.5)',
          }}
        />
        <p
          style={{
            fontFamily: 'Orbitron, sans-serif',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: 'rgba(255,255,255,0.8)',
            margin: 0,
            letterSpacing: '0.06em',
          }}
        >
          DJ KJ · Pflugerville, TX
        </p>
        <p
          style={{
            color: '#00c805',
            fontWeight: 600,
            fontSize: '0.95rem',
            margin: 0,
          }}
        >
          CashApp: $Kjwasington37
        </p>
        <p
          style={{
            color: 'rgba(255,255,255,0.35)',
            fontSize: '0.82rem',
            margin: 0,
          }}
        >
          © 2025 DJ KJ. All rights reserved.
        </p>
        <a
          href="/login"
          style={{
            color: 'rgba(255,255,255,0.18)',
            fontSize: '0.75rem',
            textDecoration: 'none',
            marginTop: '0.5rem',
          }}
        >
          Admin
        </a>
      </footer>

      {/* Package Detail Modal */}
      {selectedPackage && (
        <div
          onClick={() => setSelectedPackage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#12121a',
              border: '1px solid rgba(139,92,246,0.35)',
              borderRadius: 20,
              padding: 'clamp(1.5rem, 5vw, 2.5rem)',
              maxWidth: 480,
              width: '100%',
              boxShadow: '0 0 0 1px rgba(139,92,246,0.2), 0 24px 64px rgba(0,0,0,0.6)',
              position: 'relative',
              animation: 'modalIn 0.18s ease',
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedPackage(null)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(255,255,255,0.07)',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>

            {selectedPackage.popular && (
              <div
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  color: '#fff',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  fontFamily: 'Rajdhani, sans-serif',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '4px 14px',
                  borderRadius: 99,
                  marginBottom: '1rem',
                }}
              >
                Most Popular
              </div>
            )}

            <h3
              style={{
                fontFamily: 'Orbitron, sans-serif',
                fontWeight: 700,
                fontSize: '1.4rem',
                color: '#fff',
                margin: '0 0 0.25rem',
                letterSpacing: '0.05em',
              }}
            >
              {selectedPackage.name}
            </h3>

            <div
              style={{
                fontSize: '2.4rem',
                fontFamily: 'Orbitron, sans-serif',
                fontWeight: 900,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1,
                marginBottom: '0.25rem',
              }}
            >
              {selectedPackage.price}
            </div>

            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', margin: '0 0 1.5rem' }}>
              {selectedPackage.description} · {selectedPackage.tagline}
            </p>

            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,0.08)',
                paddingTop: '1.25rem',
                marginBottom: '1.75rem',
              }}
            >
              <p
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: '0.75rem',
                }}
              >
                What's Included
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {selectedPackage.inclusions.map((item) => (
                  <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', color: 'rgba(255,255,255,0.85)', fontSize: '0.97rem' }}>
                    <span style={{ color: '#818cf8', flexShrink: 0, marginTop: '2px' }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7L5.5 10L11.5 4" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => bookPackage(selectedPackage)}
              style={{
                width: '100%',
                padding: '0.9rem',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: '1.05rem',
                fontFamily: 'Rajdhani, sans-serif',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.04em',
                boxShadow: '0 4px 20px rgba(139,92,246,0.3)',
              }}
            >
              Book This Package →
            </button>
          </div>
        </div>
      )}

      {/* Bounce keyframe via style tag */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(8px); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ── Sub-components ── */

function PackageCard({
  name,
  price,
  description,
  tagline,
  popular,
  onClick,
}: {
  name: string;
  price: string;
  description: string;
  tagline: string;
  popular: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: '#12121a',
        border: hovered
          ? '1px solid transparent'
          : '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '2rem 1.5rem',
        textAlign: 'center',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
        boxShadow: hovered
          ? '0 0 0 1.5px #8b5cf6, 0 8px 32px rgba(139,92,246,0.25)'
          : '0 2px 8px rgba(0,0,0,0.3)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        backgroundImage: hovered
          ? 'linear-gradient(#12121a, #12121a), linear-gradient(135deg, #3b82f6, #8b5cf6)'
          : 'none',
        backgroundOrigin: 'border-box',
        backgroundClip: hovered ? 'padding-box, border-box' : 'unset',
        cursor: 'pointer',
      }}
    >
      {popular && (
        <div
          style={{
            position: 'absolute',
            top: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            color: '#fff',
            fontSize: '0.72rem',
            fontWeight: 700,
            fontFamily: 'Rajdhani, sans-serif',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '4px 14px',
            borderRadius: 99,
            whiteSpace: 'nowrap',
          }}
        >
          Most Popular
        </div>
      )}

      <h3
        style={{
          fontFamily: 'Orbitron, sans-serif',
          fontWeight: 700,
          fontSize: '1.15rem',
          color: '#fff',
          marginBottom: '1rem',
          letterSpacing: '0.05em',
        }}
      >
        {name}
      </h3>

      <div
        style={{
          fontSize: 'clamp(2.2rem, 6vw, 2.8rem)',
          fontFamily: 'Orbitron, sans-serif',
          fontWeight: 900,
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '0.75rem',
          lineHeight: 1,
        }}
      >
        {price}
      </div>

      <p
        style={{
          color: 'rgba(255,255,255,0.7)',
          fontWeight: 600,
          fontSize: '1rem',
          margin: '0 0 0.25rem',
        }}
      >
        {description}
      </p>
      <p
        style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: '0.9rem',
          margin: '0 0 1.25rem',
        }}
      >
        {tagline}
      </p>

      <div
        style={{
          fontSize: '0.82rem',
          fontWeight: 600,
          color: hovered ? '#818cf8' : 'rgba(255,255,255,0.25)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          transition: 'color 0.2s ease',
        }}
      >
        View Details →
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '0.9rem',
          fontWeight: 600,
          marginBottom: '0.4rem',
          letterSpacing: '0.03em',
        }}
      >
        {label}
        {required && <span style={{ color: '#8b5cf6', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function ThankYou({ name }: { name: string }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '2rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
      }}
    >
      {/* Checkmark */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'rgba(139,92,246,0.15)',
          border: '2px solid rgba(139,92,246,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h3
        style={{
          fontFamily: 'Orbitron, sans-serif',
          fontWeight: 700,
          fontSize: '1.6rem',
          color: '#fff',
          margin: 0,
        }}
      >
        Request Received!
      </h3>

      <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.05rem', margin: 0, lineHeight: 1.6 }}>
        Thanks <strong>{name}</strong>! DJ KJ will be in touch within 24 hours to confirm your booking details.
      </p>

      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', margin: 0 }}>
        Questions? Email us at{' '}
        <a
          href="mailto:bookings@djkjatx.com"
          style={{ color: '#8b5cf6', textDecoration: 'none', fontWeight: 600 }}
        >
          bookings@djkjatx.com
        </a>
      </p>
    </div>
  );
}
