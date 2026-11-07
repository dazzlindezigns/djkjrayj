import { useTelnyx } from '../lib/telnyx';

interface CallInterfaceProps {
  clientPhone: string | null | undefined;
  clientName: string | null | undefined;
}

export default function CallInterface({ clientPhone, clientName }: CallInterfaceProps) {
  const { callState, error, call } = useTelnyx();

  if (!clientPhone) return null;

  const busy = callState !== 'idle';
  const displayName = clientName || clientPhone;

  return (
    <div>
      {error && !busy && (
        <p className="text-xs mb-3 font-semibold" style={{ color: '#ef4444' }}>{error}</p>
      )}
      <button
        onClick={() => call(clientPhone, clientName ?? undefined)}
        disabled={busy}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold w-full justify-center"
        style={{
          background: 'rgba(59,130,246,0.12)',
          border: '1px solid rgba(59,130,246,0.25)',
          color: '#60a5fa',
          opacity: busy ? 0.5 : 1,
          cursor: busy ? 'not-allowed' : 'pointer',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.29h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
        {busy ? 'Call in progress' : `Call ${displayName}`}
      </button>
      <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
        Calls go out from the DJ KJ business number. Incoming calls ring anywhere in the dashboard while it's open.
      </p>
    </div>
  );
}
