export default function Privacy() {
  return (
    <div className="min-h-screen pb-12" style={{ background: '#0a0a0f', fontFamily: 'Rajdhani, sans-serif' }}>
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold mb-6"
            style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </a>
          <h1
            className="text-3xl font-black mb-2"
            style={{ fontFamily: 'Orbitron, sans-serif', color: '#fff' }}
          >
            Privacy Policy
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            DJ KJ · Pflugerville, TX · Last updated: September 2026
          </p>
        </div>

        <div className="flex flex-col gap-6" style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>

          <Section title="1. Who We Are">
            <p>
              DJ KJ is a DJ and entertainment service based in Pflugerville, TX. This privacy policy explains how we collect,
              use, and protect your personal information when you use our booking platform at djkjatx.com.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p>When you submit a booking inquiry or fill out our event form, we collect:</p>
            <ul>
              <li><strong>Contact information</strong> — your name, email address, and phone number</li>
              <li><strong>Event details</strong> — event date, type, venue, guest count, and start time</li>
              <li><strong>Preferences</strong> — package preferences, music notes, and special requests</li>
              <li><strong>Communication records</strong> — messages and calls exchanged through our booking platform</li>
              <li><strong>SMS consent</strong> — your opt-in timestamp when you agree to receive text messages</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <p>We use your information solely to:</p>
            <ul>
              <li>Manage and confirm your DJ booking</li>
              <li>Send booking agreements and payment reminders</li>
              <li>Communicate event details and logistics</li>
              <li>Send post-event follow-ups and satisfaction surveys</li>
              <li>Respond to your messages and inquiries</li>
            </ul>
            <p>We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>
          </Section>

          <Section title="4. Text Message (SMS) Communications">
            <p>
              By opting in on our booking form, you consent to receive text messages from DJ KJ regarding your booking.
              These messages may include:
            </p>
            <ul>
              <li>Booking confirmations and status updates</li>
              <li>Payment reminders and receipts</li>
              <li>Event day logistics and check-ins</li>
              <li>Post-event follow-ups</li>
            </ul>
            <p>
              <strong style={{ color: '#fff' }}>Message frequency</strong> varies based on your booking activity.{' '}
              <strong style={{ color: '#fff' }}>Message and data rates may apply</strong> depending on your carrier and plan.
            </p>
            <p>
              <strong style={{ color: '#fff' }}>To opt out</strong>, reply <strong style={{ color: '#fff' }}>STOP</strong> to
              any text message at any time. You will receive a one-time confirmation and no further messages will be sent.
              To re-subscribe, reply <strong style={{ color: '#fff' }}>START</strong>.
            </p>
            <p>
              For help, reply <strong style={{ color: '#fff' }}>HELP</strong> to any message or contact us at the email below.
            </p>
          </Section>

          <Section title="5. Data Storage & Security">
            <p>
              Your data is stored securely using Supabase, a cloud database provider with industry-standard encryption
              at rest and in transit. Access to your data is restricted to DJ KJ only. We retain your booking information
              for up to 3 years for business records purposes.
            </p>
          </Section>

          <Section title="6. Your Rights">
            <p>You have the right to:</p>
            <ul>
              <li>Request a copy of the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data (subject to legal record-keeping obligations)</li>
              <li>Opt out of SMS communications at any time by replying STOP</li>
            </ul>
            <p>To exercise any of these rights, contact us using the information below.</p>
          </Section>

          <Section title="7. Contact Us">
            <p>
              If you have any questions about this privacy policy or how we handle your data, please reach out:
            </p>
            <div
              className="rounded-xl p-4 mt-3"
              style={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="font-bold" style={{ color: '#fff' }}>DJ KJ</p>
              <p>Pflugerville, TX</p>
              <p>CashApp: $Kjwasington37</p>
            </div>
          </Section>

          <Section title="8. Changes to This Policy">
            <p>
              We may update this privacy policy from time to time. Changes will be posted on this page with an updated
              date at the top. Continued use of our booking platform after changes constitutes acceptance of the updated policy.
            </p>
          </Section>

        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.07)' }}>
      <h2
        className="font-bold text-base mb-3"
        style={{ fontFamily: 'Orbitron, sans-serif', color: '#fff', fontSize: '0.85rem' }}
      >
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
        {children}
      </div>
    </div>
  );
}
