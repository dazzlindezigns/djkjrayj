import { useTelnyx } from '../lib/telnyx';

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatNumber(raw: string) {
  const d = raw.replace(/\D/g, '');
  const n = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
  if (n.length !== 10) return raw;
  return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
}

const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.29h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export default function CallBanner() {
  const { callState, remoteNumber, remoteName, duration, muted, answer, hangup, toggleMute } = useTelnyx();

  if (callState === 'idle') return null;

  const title = remoteName || formatNumber(remoteNumber) || 'Unknown caller';
  const subtitle =
    callState === 'incoming' ? `Incoming call${remoteName ? ` · ${formatNumber(remoteNumber)}` : ''}`
    : callState === 'connecting' ? 'Connecting…'
    : callState === 'ringing' ? 'Calling…'
    : formatDuration(duration);

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        padding: '0 12px calc(12px + env(safe-area-inset-bottom))',
        fontFamily: 'Rajdhani, sans-serif',
      }}
    >
      <div
        className="max-w-2xl mx-auto rounded-2xl p-4 flex items-center gap-3"
        style={{
          background: '#12121a',
          border: callState === 'incoming' ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 32px rgba(139,92,246,0.15)',
          animation: callState === 'incoming' ? 'callPulse 1.6s ease-in-out infinite' : undefined,
        }}
      >
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: callState === 'active' || callState === 'incoming' ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.08)',
            color: '#fff',
          }}
        >
          <PhoneIcon />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold truncate" style={{ color: '#fff', fontSize: '1rem' }}>{title}</p>
          <p className="text-xs font-semibold" style={{ color: callState === 'incoming' ? '#a78bfa' : 'rgba(255,255,255,0.45)' }}>
            {subtitle}
          </p>
        </div>

        {callState === 'incoming' ? (
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={answer}
              className="px-4 py-2.5 rounded-xl font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff' }}
            >
              Answer
            </button>
            <button
              onClick={hangup}
              className="px-4 py-2.5 rounded-xl font-bold text-sm"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
            >
              Decline
            </button>
          </div>
        ) : (
          <div className="flex gap-2 flex-shrink-0">
            {callState === 'active' && (
              <button
                onClick={toggleMute}
                className="px-3 py-2.5 rounded-xl font-semibold text-sm"
                style={{
                  background: muted ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.07)',
                  border: muted ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.1)',
                  color: muted ? '#f87171' : 'rgba(255,255,255,0.7)',
                }}
              >
                {muted ? 'Unmute' : 'Mute'}
              </button>
            )}
            <button
              onClick={hangup}
              className="px-4 py-2.5 rounded-xl font-bold text-sm"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
            >
              End
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes callPulse {
          0%, 100% { box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 24px rgba(139,92,246,0.15); }
          50% { box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 48px rgba(139,92,246,0.45); }
        }
      `}</style>
    </div>
  );
}
