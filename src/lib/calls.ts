import { supabase } from '../supabase';
import type { CallRecord, CallStatus } from '../types';

export function last10(n: string) {
  return n.replace(/\D/g, '').slice(-10);
}

export function formatPhone(n: string) {
  const d = last10(n);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : n;
}

export function formatDuration(seconds: number | null) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

export const FINAL_STATUSES: CallStatus[] = ['answered', 'missed', 'not_connected', 'failed'];

export async function startCall(opts: {
  number: string;
  name?: string | null;
  clientId?: string | null;
  bookingId?: string | null;
}): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch('/api/voice?step=start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify(opts),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? 'Could not start the call');
  return json.id as string;
}

export async function getCall(id: string): Promise<CallRecord | null> {
  const { data } = await supabase.from('calls').select('*').eq('id', id).maybeSingle();
  return data as CallRecord | null;
}

export function statusLabel(call: CallRecord) {
  const dur = formatDuration(call.duration_seconds);
  if (call.direction === 'inbound') {
    if (call.status === 'answered') return `Incoming${dur ? ` · ${dur}` : ''}`;
    if (call.status === 'ringing') return 'Ringing';
    return 'Missed call';
  }
  if (call.status === 'answered') return `Outgoing${dur ? ` · ${dur}` : ''}`;
  if (call.status === 'missed') return 'Outgoing · no answer';
  if (call.status === 'not_connected') return 'Outgoing · not connected';
  if (call.status === 'failed') return 'Outgoing · failed';
  return 'Outgoing · calling';
}
