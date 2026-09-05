import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
// @ts-ignore — Telnyx WebRTC ships its own types
import { TelnyxRTC } from '@telnyx/webrtc';

type CallState = 'idle' | 'connecting' | 'ringing' | 'active' | 'incoming' | 'error';

interface CallInterfaceProps {
  clientPhone: string | null | undefined;
  clientName: string | null | undefined;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function CallInterface({ clientPhone, clientName }: CallInterfaceProps) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  const clientRef = useRef<InstanceType<typeof TelnyxRTC> | null>(null);
  const activeCallRef = useRef<unknown>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callerNumberRef = useRef<string>('');

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setDuration(0);
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  }, [stopTimer]);

  const teardown = useCallback(() => {
    stopTimer();
    setCallState('idle');
    setMuted(false);
    activeCallRef.current = null;
  }, [stopTimer]);

  async function initClient() {
    if (clientRef.current) return clientRef.current;

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/telnyx-credentials', {
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
    });

    if (!res.ok) throw new Error('Could not load calling credentials');
    const { username, password, callerNumber } = await res.json();
    callerNumberRef.current = callerNumber;

    const rtc = new TelnyxRTC({ login: username, password });
    clientRef.current = rtc;

    rtc.on('telnyx.ready', () => {});
    rtc.on('telnyx.error', (err: Error) => {
      setErrorMsg(err?.message ?? 'Calling error');
      setCallState('error');
    });

    rtc.on('telnyx.notification', (notification: { type: string; call: unknown }) => {
      if (notification.type !== 'callUpdate') return;
      const call = notification.call as {
        state: string;
        answer: () => void;
        hangup: () => void;
        muteAudio: () => void;
        unmuteAudio: () => void;
      };
      activeCallRef.current = call;

      switch (call.state) {
        case 'ringing':
          setCallState('incoming');
          break;
        case 'active':
          setCallState('active');
          startTimer();
          break;
        case 'hangup':
        case 'destroy':
          teardown();
          break;
      }
    });

    await rtc.connect();
    return rtc;
  }

  async function handleCall() {
    if (!clientPhone) return;
    setCallState('connecting');
    setErrorMsg('');

    try {
      const rtc = await initClient();
      const call = rtc.newCall({
        destinationNumber: clientPhone.replace(/\D/g, '').replace(/^(\d{10})$/, '+1$1'),
        callerName: 'DJ KJ',
        callerNumber: callerNumberRef.current,
      });
      activeCallRef.current = call;
      setCallState('ringing');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to call');
      setCallState('error');
    }
  }

  function handleAnswer() {
    const call = activeCallRef.current as { answer: () => void } | null;
    if (call) call.answer();
  }

  function handleHangup() {
    const call = activeCallRef.current as { hangup: () => void } | null;
    if (call) call.hangup();
    teardown();
  }

  function handleMute() {
    const call = activeCallRef.current as { muteAudio: () => void; unmuteAudio: () => void } | null;
    if (!call) return;
    if (muted) { call.unmuteAudio(); setMuted(false); }
    else { call.muteAudio(); setMuted(true); }
  }

  useEffect(() => () => {
    stopTimer();
    clientRef.current?.disconnect?.();
  }, [stopTimer]);

  if (!clientPhone) return null;

  const displayName = clientName || clientPhone;

  if (callState === 'idle' || callState === 'error') {
    return (
      <div>
        {errorMsg && (
          <p className="text-xs mb-3 font-semibold" style={{ color: '#ef4444' }}>{errorMsg}</p>
        )}
        <button
          onClick={handleCall}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold w-full justify-center"
          style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.29h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          Call {displayName}
        </button>
      </div>
    );
  }

  if (callState === 'incoming') {
    return (
      <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)' }}>
        <p className="text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Incoming call from</p>
        <p className="font-bold text-lg mb-4" style={{ color: '#fff' }}>{displayName}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={handleAnswer} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff' }}>
            Answer
          </button>
          <button onClick={handleHangup} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
            Decline
          </button>
        </div>
      </div>
    );
  }

  // connecting / ringing / active
  return (
    <div className="rounded-2xl p-4 text-center" style={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div
        className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
        style={{ background: callState === 'active' ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.07)' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.29h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      </div>
      <p className="font-bold text-lg" style={{ color: '#fff' }}>{displayName}</p>
      <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {callState === 'connecting' ? 'Connecting…' : callState === 'ringing' ? 'Ringing…' : formatDuration(duration)}
      </p>

      <div className="flex gap-3 justify-center">
        {callState === 'active' && (
          <button
            onClick={handleMute}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
            style={{
              background: muted ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.07)',
              border: muted ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.1)',
              color: muted ? '#f87171' : 'rgba(255,255,255,0.6)',
            }}
          >
            {muted ? 'Unmute' : 'Mute'}
          </button>
        )}
        <button
          onClick={handleHangup}
          className="flex-1 py-2.5 rounded-xl font-bold text-sm"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
        >
          End Call
        </button>
      </div>
    </div>
  );
}
