export default function Terms() {
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
            Terms & Conditions
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            DJ KJ · Pflugerville, TX · Last updated: September 2026
          </p>
        </div>

        <div className="flex flex-col gap-6">

          <Section title="1. Agreement to Terms">
            <p>
              By submitting a booking inquiry or using the djkjatx.com platform, you agree to these Terms & Conditions.
              If you do not agree, please do not submit a booking request.
            </p>
          </Section>

          <Section title="2. Booking & Confirmation">
            <p>
              Submitting a booking inquiry does not guarantee availability or confirm a booking. A booking is only
              confirmed once:
            </p>
            <ul>
              <li>You have received and signed the booking agreement sent by DJ KJ</li>
              <li>The required deposit has been received and acknowledged</li>
            </ul>
            <p>
              DJ KJ reserves the right to decline any booking request at their discretion.
            </p>
          </Section>

          <Section title="3. Deposit & Payment">
            <ul>
              <li>A non-refundable deposit (typically 50% of the total) is required to secure your date.</li>
              <li>The remaining balance is due on or before the day of the event.</li>
              <li>Payment is accepted via CashApp (<strong style={{ color: '#fff' }}>$Kjwasington37</strong>).</li>
              <li>Failure to pay the balance by the event date may result in cancellation of services.</li>
            </ul>
          </Section>

          <Section title="4. Cancellation Policy">
            <ul>
              <li>
                <strong style={{ color: '#fff' }}>Cancellations by the client:</strong> The deposit is non-refundable.
                Cancellations made within 14 days of the event date forfeit 100% of the total booking amount.
              </li>
              <li>
                <strong style={{ color: '#fff' }}>Cancellations by DJ KJ:</strong> In the rare event DJ KJ must cancel
                due to an emergency or unavoidable circumstance, a full refund of any payments made will be issued.
              </li>
            </ul>
          </Section>

          <Section title="5. Event Requirements">
            <p>The client is responsible for ensuring:</p>
            <ul>
              <li>Adequate space and power supply (standard 120V outlet within 50 ft) at the venue</li>
              <li>Safe and accessible setup area for equipment</li>
              <li>Notifying DJ KJ of any venue restrictions (noise ordinances, load-in times, etc.) in advance</li>
              <li>Obtaining any required permits or permissions for the event</li>
            </ul>
          </Section>

          <Section title="6. Performance Time">
            <p>
              Performance hours are as agreed in the booking. Additional time beyond the agreed hours may be available
              at an additional rate, subject to DJ KJ's availability and discretion. Setup and teardown time are not
              counted as performance time unless otherwise agreed.
            </p>
          </Section>

          <Section title="7. Equipment & Liability">
            <p>
              DJ KJ provides professional audio and lighting equipment. DJ KJ is not liable for:
            </p>
            <ul>
              <li>Damage to the venue or third-party property caused by event guests</li>
              <li>Circumstances beyond our control (power outages, severe weather, acts of God)</li>
              <li>Cancellations due to government-mandated restrictions or public health emergencies</li>
            </ul>
            <p>
              The client agrees to ensure that guests treat DJ KJ's equipment with respect. Damage to equipment caused
              by guests may result in repair or replacement charges billed to the client.
            </p>
          </Section>

          <Section title="8. Music & Content">
            <p>
              DJ KJ will make reasonable efforts to accommodate music requests and preferences provided in advance.
              DJ KJ reserves the right to use professional judgment regarding song selection and pacing to best serve
              the event and its guests. DJ KJ is not liable for any copyright claims arising from music played at
              private events.
            </p>
          </Section>

          <Section title="9. Text Message Communications">
            <p>
              By opting in to SMS communications on our booking form, you agree to receive text messages related to
              your booking. You may opt out at any time by replying <strong style={{ color: '#fff' }}>STOP</strong>.
              See our <a href="/privacy" style={{ color: '#818cf8', textDecoration: 'underline' }}>Privacy Policy</a> for
              full details on how your information is handled.
            </p>
          </Section>

          <Section title="10. Modifications">
            <p>
              Changes to booking details (date, time, venue, or package) must be requested at least 7 days before
              the event and are subject to availability. DJ KJ will make reasonable efforts to accommodate changes
              but cannot guarantee them.
            </p>
          </Section>

          <Section title="11. Governing Law">
            <p>
              These Terms & Conditions are governed by the laws of the State of Texas. Any disputes arising from a
              booking will be resolved in the courts of Travis County, Texas.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>Questions about these terms? Reach out before submitting your booking:</p>
            <div
              className="rounded-xl p-4 mt-2"
              style={{ background: '#0f0f18', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="font-bold" style={{ color: '#fff' }}>DJ KJ</p>
              <p style={{ color: 'rgba(255,255,255,0.55)' }}>Pflugerville, TX · djkjatx.com</p>
            </div>
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
        className="font-bold mb-3"
        style={{ fontFamily: 'Orbitron, sans-serif', color: '#fff', fontSize: '0.85rem' }}
      >
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-sm" style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  );
}
