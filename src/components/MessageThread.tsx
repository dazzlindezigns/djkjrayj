import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { format, parseISO } from 'date-fns';

interface Message {
  id: string;
  created_at: string;
  direction: 'inbound' | 'outbound';
  body: string;
  from_number: string;
  to_number: string;
  status: string;
}

interface MessageThreadProps {
  bookingId: string;
  clientPhone: string | null | undefined;
}

export default function MessageThread({ bookingId, clientPhone }: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });
    setMessages((data as Message[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadMessages();

    // Real-time subscription for inbound messages
    const channel = supabase
      .channel(`messages:${bookingId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'djkj', table: 'messages', filter: `booking_id=eq.${bookingId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [bookingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!draft.trim() || !clientPhone) return;
    setSending(true);
    setError('');

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/send-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      },
      body: JSON.stringify({ bookingId, to: clientPhone, body: draft.trim() }),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error ?? 'Failed to send');
    } else {
      setDraft('');
      loadMessages();
    }
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!clientPhone) {
    return (
      <div className="text-center py-6" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
        No phone number on file — add one to enable messaging.
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ minHeight: '200px' }}>
      {/* Message list */}
      <div
        className="flex flex-col gap-2 overflow-y-auto mb-3 pr-1"
        style={{ maxHeight: '320px', minHeight: loading ? '80px' : undefined }}
      >
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#8b5cf6' }} />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center py-6 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            No messages yet. Start the conversation.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="flex"
              style={{ justifyContent: msg.direction === 'outbound' ? 'flex-end' : 'flex-start' }}
            >
              <div
                className="rounded-2xl px-3 py-2 text-sm"
                style={{
                  maxWidth: '80%',
                  background: msg.direction === 'outbound'
                    ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                    : '#1a1a26',
                  color: msg.direction === 'outbound' ? '#fff' : 'rgba(255,255,255,0.85)',
                  border: msg.direction === 'inbound' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  borderRadius: msg.direction === 'outbound' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                }}
              >
                <p style={{ lineHeight: 1.4 }}>{msg.body}</p>
                <p className="mt-1 text-xs" style={{ color: msg.direction === 'outbound' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)' }}>
                  {format(parseISO(msg.created_at), 'h:mm a')}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs mb-2 font-semibold" style={{ color: '#ef4444' }}>{error}</p>
      )}

      {/* Compose */}
      <div className="flex gap-2 items-end">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Text ${clientPhone}…`}
          rows={2}
          style={{
            flex: 1,
            resize: 'none',
            fontSize: '14px',
            borderRadius: '12px',
            padding: '10px 12px',
            background: '#0f0f18',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            fontFamily: 'Rajdhani, sans-serif',
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !draft.trim()}
          className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{
            width: '44px',
            height: '44px',
            background: sending || !draft.trim() ? 'rgba(139,92,246,0.3)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          }}
        >
          {sending ? (
            <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>
      <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
