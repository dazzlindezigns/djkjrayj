import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../supabase';
import type { CallRecord } from '../types';
import { formatPhone, last10, startCall, statusLabel } from '../lib/calls';

interface ClientLite {
  id: string;
  name: string;
  phone: string | null;
}

export default function RecentCalls({ onAddClient }: { onAddClient: (phone: string) => void }) {
  const navigate = useNavigate();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: callData }, { data: clientData }] = await Promise.all([
      supabase
        .from('calls')
        .select('*')
        .eq('dismissed', false)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase.from('clients').select('id, name, phone'),
    ]);
    setCalls((callData as CallRecord[]) ?? []);
    setClients((clientData as ClientLite[]) ?? []);
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, [load]);

  function clientFor(call: CallRecord) {
    const target = last10(call.client_number);
    return clients.find((c) => c.phone && last10(c.phone) === target);
  }

  async function dismiss(id: string) {
    setCalls((prev) => prev.filter((c) => c.id !== id));
    await supabase.from('calls').update({ dismissed: true }).eq('id', id);
  }

  async function callBack(call: CallRecord) {
    const client = clientFor(call);
    setNotice('');
    try {
      await startCall({
        number: call.client_number,
        name: client?.name ?? call.caller_name,
        clientId: client?.id ?? call.client_id,
        bookingId: call.booking_id,
      });
      setNotice('Calling your phone — answer and press 1 to connect.');
      setTimeout(load, 15000);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not start the call');
    }
  }

  if (calls.length === 0) return null;

  return (
    <div className="rounded-2xl p-4 mb-5" style={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.08)' }}>
      <h2
        className="font-bold uppercase tracking-widest mb-3"
        style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Orbitron, sans-serif', fontSize: '10px' }}
      >
        Recent Calls
      </h2>

      {notice && (
        <p className="text-xs font-semibold mb-3" style={{ color: '#a78bfa' }}>{notice}</p>
      )}

      <div className="flex flex-col gap-2">
        {calls.map((call) => {
          const client = clientFor(call);
          const missed = call.direction === 'inbound' && call.status === 'missed';
          const title = client?.name ?? call.caller_name ?? formatPhone(call.client_number);
          const known = !!client;

          return (
            <div
              key={call.id}
              className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: '#1a1a26', border: missed ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.06)' }}
            >
              <button
                className="flex-1 min-w-0 text-left"
                onClick={() => call.booking_id && navigate(`/dashboard/booking/${call.booking_id}`)}
                style={{ cursor: call.booking_id ? 'pointer' : 'default' }}
              >
                <p className="font-semibold text-sm truncate" style={{ color: '#fff' }}>
                  {title}
                  {!known && (
                    <span className="ml-2 text-xs font-semibold" style={{ color: '#a78bfa' }}>New caller</span>
                  )}
                </p>
                <p className="text-xs" style={{ color: missed ? '#f87171' : 'rgba(255,255,255,0.4)' }}>
                  {statusLabel(call)} · {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                  {!known && call.caller_name ? ` · ${formatPhone(call.client_number)}` : ''}
                </p>
              </button>

              <div className="flex gap-1.5 flex-shrink-0">
                {!known && (
                  <button
                    onClick={() => onAddClient(formatPhone(call.client_number))}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}
                  >
                    Add
                  </button>
                )}
                <button
                  onClick={() => callBack(call)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa' }}
                >
                  Call
                </button>
                <button
                  onClick={() => dismiss(call.id)}
                  aria-label="Dismiss"
                  className="px-2 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
