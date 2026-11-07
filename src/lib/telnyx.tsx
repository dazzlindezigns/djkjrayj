import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
// @ts-ignore — Telnyx WebRTC ships its own types
import { TelnyxRTC } from '@telnyx/webrtc';
import { supabase } from '../supabase';

export type CallState = 'idle' | 'connecting' | 'ringing' | 'incoming' | 'active';

interface TelnyxCall {
  state: string;
  direction: 'inbound' | 'outbound';
  options?: { remoteCallerNumber?: string; remoteCallerName?: string; destinationNumber?: string };
  answer: () => void;
  hangup: () => void;
  muteAudio: () => void;
  unmuteAudio: () => void;
}

interface TelnyxContextValue {
  ready: boolean;
  callState: CallState;
  remoteNumber: string;
  remoteName: string;
  duration: number;
  muted: boolean;
  error: string;
  call: (number: string, name?: string) => Promise<void>;
  answer: () => void;
  hangup: () => void;
  toggleMute: () => void;
}

const REMOTE_AUDIO_ID = 'telnyx-remote-audio';
const RINGING_STATES = new Set(['new', 'requesting', 'trying', 'early', 'ringing']);
const ENDED_STATES = new Set(['hangup', 'destroy', 'purge']);

const TelnyxContext = createContext<TelnyxContextValue | null>(null);

export function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

function last10(raw: string): string {
  return raw.replace(/\D/g, '').slice(-10);
}

export function TelnyxProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [callState, setCallState] = useState<CallState>('idle');
  const [remoteNumber, setRemoteNumber] = useState('');
  const [remoteName, setRemoteName] = useState('');
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');

  const rtcRef = useRef<InstanceType<typeof TelnyxRTC> | null>(null);
  const callRef = useRef<TelnyxCall | null>(null);
  const callerNumberRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectingRef = useRef<Promise<void> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const teardown = useCallback(() => {
    stopTimer();
    callRef.current = null;
    setCallState('idle');
    setMuted(false);
    setDuration(0);
    setRemoteNumber('');
    setRemoteName('');
  }, [stopTimer]);

  const lookupClientName = useCallback(async (number: string) => {
    const target = last10(number);
    if (!target) return;
    const { data } = await supabase.from('clients').select('name, phone').limit(300);
    const match = (data ?? []).find((c: { phone: string | null }) => c.phone && last10(c.phone) === target);
    if (match) setRemoteName((match as { name: string }).name);
  }, []);

  const connect = useCallback(async () => {
    if (rtcRef.current) return;
    if (connectingRef.current) return connectingRef.current;

    connectingRef.current = (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');

      const res = await fetch('/api/telnyx-credentials', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Calling is not configured yet');
      const { username, password, callerNumber } = await res.json();
      if (!username || !password) throw new Error('Calling is not configured yet');
      callerNumberRef.current = callerNumber ?? '';

      const rtc = new TelnyxRTC({ login: username, password });
      rtc.remoteElement = REMOTE_AUDIO_ID;

      rtc.on('telnyx.ready', () => { setReady(true); setError(''); });
      rtc.on('telnyx.error', (err: Error) => setError(err?.message ?? 'Calling error'));
      rtc.on('telnyx.socket.close', () => { setReady(false); rtcRef.current = null; });

      rtc.on('telnyx.notification', (n: { type: string; call?: TelnyxCall }) => {
        if (n.type !== 'callUpdate' || !n.call) return;
        const call = n.call;
        callRef.current = call;

        if (ENDED_STATES.has(call.state)) { teardown(); return; }

        if (call.state === 'active') {
          setCallState('active');
          stopTimer();
          setDuration(0);
          timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
          return;
        }

        if (RINGING_STATES.has(call.state)) {
          if (call.direction === 'inbound') {
            const from = call.options?.remoteCallerNumber ?? '';
            setRemoteNumber(from);
            setRemoteName(call.options?.remoteCallerName ?? '');
            setCallState('incoming');
            lookupClientName(from);
          } else {
            setCallState('ringing');
          }
        }
      });

      rtcRef.current = rtc;
      await rtc.connect();
    })();

    try {
      await connectingRef.current;
    } finally {
      connectingRef.current = null;
    }
  }, [lookupClientName, stopTimer, teardown]);

  useEffect(() => {
    connect().catch((err: Error) => setError(err.message));
    return () => {
      stopTimer();
      rtcRef.current?.disconnect?.();
      rtcRef.current = null;
    };
  }, [connect, stopTimer]);

  const call = useCallback(async (number: string, name?: string) => {
    setError('');
    setRemoteNumber(number);
    setRemoteName(name ?? '');
    setCallState('connecting');
    try {
      await connect();
      const rtc = rtcRef.current;
      if (!rtc) throw new Error('Not connected');
      callRef.current = rtc.newCall({
        destinationNumber: toE164(number),
        callerNumber: callerNumberRef.current,
        callerName: 'DJ KJ',
        audio: true,
        video: false,
      }) as TelnyxCall;
      setCallState('ringing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place call');
      teardown();
    }
  }, [connect, teardown]);

  const answer = useCallback(() => { callRef.current?.answer(); }, []);

  const hangup = useCallback(() => {
    callRef.current?.hangup();
    teardown();
  }, [teardown]);

  const toggleMute = useCallback(() => {
    const c = callRef.current;
    if (!c) return;
    if (muted) c.unmuteAudio(); else c.muteAudio();
    setMuted(!muted);
  }, [muted]);

  return (
    <TelnyxContext.Provider value={{ ready, callState, remoteNumber, remoteName, duration, muted, error, call, answer, hangup, toggleMute }}>
      {children}
      <audio id={REMOTE_AUDIO_ID} autoPlay playsInline />
    </TelnyxContext.Provider>
  );
}

export function useTelnyx(): TelnyxContextValue {
  const ctx = useContext(TelnyxContext);
  if (!ctx) throw new Error('useTelnyx must be used inside TelnyxProvider');
  return ctx;
}
