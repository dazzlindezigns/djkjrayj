import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isSignedIn } from './_auth.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'djkj' } }
);

const BUSINESS_NUMBER = process.env.TELNYX_PHONE_NUMBER ?? '';
const OWNER_CELL = process.env.OWNER_CELL_NUMBER ?? '';
const VOICE_TOKEN = process.env.TELNYX_VOICE_TOKEN ?? '';

let accountSid = process.env.TELNYX_ACCOUNT_SID ?? '';

type Params = Record<string, string | undefined>;

interface CallRow {
  id: string;
  direction: 'inbound' | 'outbound';
  status: string;
  client_number: string;
  caller_name: string | null;
}

function last10(n: string) {
  return n.replace(/\D/g, '').slice(-10);
}

function toE164(n: string) {
  const d = n.replace(/\D/g, '');
  return d.length === 10 ? `+1${d}` : `+${d}`;
}

function xml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));
}

function spoken(number: string) {
  return last10(number).split('').join(' ');
}

function texml(res: VercelResponse, body: string) {
  res.setHeader('Content-Type', 'application/xml');
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`);
}

function tokenOk(token: string | undefined) {
  if (!VOICE_TOKEN || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(VOICE_TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
}

function baseUrl(req: VercelRequest) {
  const host = (req.headers['x-forwarded-host'] as string) ?? req.headers.host;
  return `https://${host}`;
}

function stepUrl(req: VercelRequest, step: string, id?: string) {
  const q = new URLSearchParams({ step, token: VOICE_TOKEN });
  if (id) q.set('id', id);
  return `${baseUrl(req)}/api/voice?${q.toString()}`;
}

async function getAccountSid() {
  if (accountSid) return accountSid;
  const r = await fetch('https://api.telnyx.com/v2/user_profile', {
    headers: { Authorization: `Bearer ${process.env.TELNYX_API_KEY}` },
  });
  const json = await r.json().catch(() => null);
  accountSid = json?.data?.user_id ?? '';
  return accountSid;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([p, new Promise<undefined>((r) => setTimeout(() => r(undefined), ms))]);
}

async function findClient(number: string) {
  const target = last10(number);
  const { data: clients } = await supabase.from('clients').select('id, name, phone');
  const client = (clients ?? []).find((c: { phone: string | null }) => c.phone && last10(c.phone) === target) as
    | { id: string; name: string }
    | undefined;
  if (!client) return null;

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, status, event_type, event_date')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(5);
  const list = (bookings ?? []) as { id: string; status: string; event_type: string | null; event_date: string | null }[];
  const booking = list.find((b) => !['cancelled', 'completed'].includes(b.status)) ?? list[0] ?? null;
  return { client, booking };
}

function eventLabel(b: { event_type: string | null; event_date: string | null } | null) {
  if (!b) return '';
  const date = b.event_date
    ? new Date(`${b.event_date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';
  return [b.event_type, date].filter(Boolean).join(', ');
}

function prettyNumber(n: string) {
  const d = last10(n);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : n;
}

async function push(req: VercelRequest, title: string, body: string, url: string) {
  await fetch(`${baseUrl(req)}/api/send-push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body, url }),
  }).catch(() => {});
}

async function getCall(id: string | undefined, callSid: string | undefined): Promise<CallRow | null> {
  if (id) {
    const { data } = await supabase.from('calls').select('*').eq('id', id).maybeSingle();
    return data as CallRow | null;
  }
  if (callSid) {
    const { data } = await supabase.from('calls').select('*').eq('telnyx_call_sid', callSid).maybeSingle();
    return data as CallRow | null;
  }
  return null;
}

async function setCall(id: string, fields: Record<string, unknown>) {
  await supabase.from('calls').update(fields).eq('id', id);
}

// ── Outbound: dashboard asks Telnyx to ring the owner's cell ──
async function start(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await isSignedIn(supabase, req))) return res.status(401).json({ error: 'Unauthorized' });

  const { number, clientId, bookingId, name } = (req.body ?? {}) as Params & { number?: string };
  const to = toE164(number ?? '');
  if (!/^\+1[2-9]\d{9}$/.test(to)) return res.status(400).json({ error: 'Enter a valid US phone number' });

  const appId = process.env.TELNYX_TEXML_APP_ID;
  if (!appId || !OWNER_CELL || !BUSINESS_NUMBER || !VOICE_TOKEN) {
    return res.status(500).json({ error: 'Calling is not configured yet' });
  }
  const sid = await getAccountSid();
  if (!sid) return res.status(500).json({ error: 'Could not look up the Telnyx account — check TELNYX_API_KEY' });

  const { data: row, error } = await supabase
    .from('calls')
    .insert({
      direction: 'outbound',
      status: 'ringing',
      client_number: to,
      client_id: clientId || null,
      booking_id: bookingId || null,
      caller_name: name || null,
    })
    .select('id')
    .single();
  if (error || !row) return res.status(500).json({ error: error?.message ?? 'Could not log call' });

  const telnyx = await fetch(`https://api.telnyx.com/v2/texml/Accounts/${sid}/Calls`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.TELNYX_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ApplicationSid: appId,
      To: toE164(OWNER_CELL),
      From: BUSINESS_NUMBER,
      Url: stepUrl(req, 'bridge', row.id),
      UrlMethod: 'POST',
      StatusCallback: stepUrl(req, 'status', row.id),
      StatusCallbackMethod: 'POST',
      Timeout: 25,
    }),
  });

  if (!telnyx.ok) {
    const detail = await telnyx.json().catch(() => null);
    await setCall(row.id, { status: 'failed' });
    return res.status(502).json({ error: detail?.errors?.[0]?.detail ?? 'Telnyx could not start the call' });
  }

  return res.status(200).json({ id: row.id });
}

// ── Outbound: owner answered; confirm with a key press so voicemail never reaches the client ──
async function bridge(req: VercelRequest, res: VercelResponse, p: Params) {
  const call = await getCall(p.id, undefined);
  if (!call) return texml(res, '<Hangup/>');
  if (p.CallSid) await setCall(call.id, { telnyx_call_sid: p.CallSid });

  const who = call.caller_name || spoken(call.client_number);
  texml(
    res,
    `<Gather numDigits="1" timeout="8" action="${xml(stepUrl(req, 'connect', call.id))}">` +
      `<Say>Calling ${xml(who)}. Press 1 to connect.</Say>` +
      `</Gather><Say>Call cancelled.</Say><Hangup/>`
  );
}

async function connect(req: VercelRequest, res: VercelResponse, p: Params) {
  const call = await getCall(p.id, undefined);
  if (!call || !p.Digits) return texml(res, '<Hangup/>');
  await setCall(call.id, { status: 'connecting' });
  texml(
    res,
    `<Dial callerId="${xml(BUSINESS_NUMBER)}" timeout="30" action="${xml(stepUrl(req, 'dial-result', call.id))}">` +
      `<Number>${xml(call.client_number)}</Number></Dial>`
  );
}

// ── Inbound: client calls the business number; ring the owner's cell from the business number ──
async function inbound(req: VercelRequest, res: VercelResponse, p: Params) {
  const from = p.From ?? '';
  if (!OWNER_CELL || !BUSINESS_NUMBER) {
    return texml(res, '<Say>Sorry, we are unable to take your call right now. Please try again later.</Say><Hangup/>');
  }

  const callerIdName = p.CallerId && last10(p.CallerId) !== last10(from) ? p.CallerId : null;

  const logAndNotify = async () => {
    const match = await findClient(from);
    const { data: row } = await supabase
      .from('calls')
      .insert({
        direction: 'inbound',
        status: 'ringing',
        client_number: toE164(from),
        client_id: match?.client.id ?? null,
        booking_id: match?.booking?.id ?? null,
        caller_name: match?.client.name ?? callerIdName,
        telnyx_call_sid: p.CallSid ?? null,
      })
      .select('id')
      .single();

    const title = match ? `📞 ${match.client.name}` : '📞 Incoming call · New caller';
    const detail = match ? eventLabel(match.booking) : callerIdName ?? '';
    const body = [prettyNumber(from), detail].filter(Boolean).join(' · ');
    const url = match?.booking ? `/dashboard/booking/${match.booking.id}` : '/dashboard';
    await push(req, title, body, url);
    return row?.id as string | undefined;
  };

  const id = await withTimeout(logAndNotify(), 2500);
  const action = stepUrl(req, 'dial-result', id);

  texml(
    res,
    `<Dial callerId="${xml(BUSINESS_NUMBER)}" timeout="30" answerOnBridge="true" action="${xml(action)}">` +
      `<Number>${xml(toE164(OWNER_CELL))}</Number></Dial>`
  );
}

// ── Both directions: the bridged leg ended ──
async function dialResult(req: VercelRequest, res: VercelResponse, p: Params) {
  const call = await getCall(p.id, p.CallSid);
  const answered = p.DialCallStatus === 'completed';

  if (call) {
    await setCall(call.id, {
      status: answered ? 'answered' : 'missed',
      duration_seconds: p.DialCallDuration ? parseInt(p.DialCallDuration, 10) : null,
    });
    if (!answered && call.direction === 'inbound') {
      await push(req, '📵 Missed call', call.caller_name ?? prettyNumber(call.client_number), '/dashboard');
    }
  }

  if (answered) return texml(res, '<Hangup/>');
  if (call?.direction === 'outbound') return texml(res, '<Say>No answer.</Say><Hangup/>');
  texml(res, '<Say>Sorry, we could not take your call. Please try again later.</Say><Hangup/>');
}

// ── Call ended: settle anything still marked as ringing ──
async function status(req: VercelRequest, res: VercelResponse, p: Params) {
  const call = await getCall(p.id, p.CallSid);
  if (call && (call.status === 'ringing' || call.status === 'connecting')) {
    if (call.status === 'connecting') {
      await setCall(call.id, { status: 'missed' });
    } else if (call.direction === 'outbound') {
      await setCall(call.id, { status: 'not_connected' });
    } else {
      await setCall(call.id, { status: 'missed' });
      await push(req, '📵 Missed call', call.caller_name ?? prettyNumber(call.client_number), '/dashboard');
    }
  }
  res.status(200).end();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const step = req.query.step as string | undefined;

  if (step === 'start') return start(req, res);

  if (!tokenOk(req.query.token as string | undefined)) return res.status(403).end();

  const p: Params = { ...(req.query as Params), ...((req.body ?? {}) as Params) };

  switch (step) {
    case 'inbound': return inbound(req, res, p);
    case 'bridge': return bridge(req, res, p);
    case 'connect': return connect(req, res, p);
    case 'dial-result': return dialResult(req, res, p);
    case 'status': return status(req, res, p);
    default: return res.status(404).end();
  }
}
