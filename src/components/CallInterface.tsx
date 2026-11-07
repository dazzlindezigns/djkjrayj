import { useCallback, useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../supabase';
import type { CallRecord } from '../types';
import { FINAL_STATUSES, getCall, startCall, statusLabel } from '../lib/calls';

interface CallInterfaceProps {
  clientPhone: string | null | undefined;
  clientName: string | null | undefined;
  clientId?: string | null;
  bookingId: string;
}

const PROGRESS_TEXT: Record<string, string> = {
  ringing: 'Calling your phone — answer it and press 1 to connect.',
  connecting: 'Connected to the client line.',
};

export default function CallInterface({ clientPhone, clientName, clientId, bookingId }: CallInterfaceProps) {
  const [active, setActive] = useState<CallRecord | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<CallRecord[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from('calls')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(5);
    setHistory((data as CallRecord[]) ?? []);
  }, [bookingId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  function track(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    const startedAt = Date.now();
    pollRef.current = setInterval(async () => {
      const call = await getCall(id);
      if (call) setActive(call);
      const finished = !call || FINAL_STATUSES.includes(call.status);
      if (finished || Date.now() - startedAt > 60 * 60_000) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setTimeout(() => setActive(null), 4000);
        loadHistory();
      }
    }, 2000);
  }

  async function handleCall() {
    if (!clientPhone) return;
    setError('');
    setStarting(true);
    try {
      const id = await startCall({ number: clientPhone, name: clientName, clientId, bookingId });
      setActive({ id, status: 'ringing', direction: 'outbound' } as CallRecord);
      track(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the call');
    } finally {
      setStarting(false);
    }
  }

  if (!clientPhone) return null;

  const busy = starting || (!!active && !FINAL_STATUSES.includes(active.status));
  const displayName = clientName || clientPhone;

  return (
    <div>
      {error && <p className="text-xs mb-3 font-semibold" style={{ color: '#ef4444' }}>{error}</p>}

      {active ? (
        <div
          className="rounded-xl p-3 mb-3 text-sm font-semibold"
          style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}
        >
          {PROGRESS_TEXT[active.status] ?? statusLabel(active)}
        </div>
      ) : null}

      <button
        onClick={handleCall}
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
        Your phone rings first from the business number. Answer and press 1, and the client sees the business number too.
      </p>

      {history.length > 0 && (
        <div className="mt-4 flex flex-col gap-1.5">
          {history.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-xs">
              <span style={{ color: c.status === 'missed' && c.direction === 'inbound' ? '#f87171' : 'rgba(255,255,255,0.6)' }}>
                {statusLabel(c)}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
