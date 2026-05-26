import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import type { Booking, BookingStatus } from '../types';
import BookingCard from '../components/BookingCard';
import AddClientModal from '../components/AddClientModal';

interface StatCardProps {
  label: string;
  value: number;
  color: string;
}

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div
      className="flex-1 rounded-xl p-4"
      style={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="text-2xl font-bold mb-1" style={{ color, fontFamily: 'Orbitron, sans-serif' }}>
        {value}
      </div>
      <div className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {label}
      </div>
    </div>
  );
}

const AWAITING_STATUSES: BookingStatus[] = ['inquiry_sent', 'inquiry_submitted'];
const SIGNATURE_STATUSES: BookingStatus[] = ['confirmed', 'agreement_sent'];
const DEPOSIT_STATUSES: BookingStatus[] = ['signed'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const loadBookings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('*, clients(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading bookings:', error);
    } else {
      setBookings((data as Booking[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  }

  const totalCount = bookings.length;
  const awaitingCount = bookings.filter((b) => AWAITING_STATUSES.includes(b.status)).length;
  const signatureCount = bookings.filter((b) => SIGNATURE_STATUSES.includes(b.status)).length;
  const depositCount = bookings.filter((b) => DEPOSIT_STATUSES.includes(b.status)).length;

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'active')
      return !['completed', 'cancelled'].includes(b.status);
    if (filter === 'completed')
      return ['completed', 'cancelled'].includes(b.status);
    return true;
  });

  return (
    <div
      className="min-h-screen"
      style={{ background: '#0a0a0f', fontFamily: 'Rajdhani, sans-serif' }}
    >
      {/* Background glow */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: '-10%',
          right: '-10%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="max-w-2xl mx-auto px-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <img
              src="/icons/icon-512.png"
              alt="DJ KJ"
              style={{ width: '52px', height: '52px', objectFit: 'contain' }}
            />
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Booking Manager
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                color: '#fff',
              }}
            >
              <span className="text-lg leading-none">+</span>
              <span className="hidden sm:inline">Add Client</span>
            </button>
            <button
              onClick={handleSignOut}
              className="px-3 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
              title="Sign out"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
          <StatCard label="Total" value={totalCount} color="#ffffff" />
          <StatCard label="Awaiting" value={awaitingCount} color="#8b5cf6" />
          <StatCard label="Pending Sig" value={signatureCount} color="#eab308" />
          <StatCard label="Deposit Due" value={depositCount} color="#f97316" />
        </div>

        {/* Filter tabs */}
        <div
          className="flex gap-1 p-1 rounded-xl mb-5"
          style={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {(['all', 'active', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all"
              style={{
                background: filter === f ? '#1a1a26' : 'transparent',
                color: filter === f ? '#ffffff' : 'rgba(255,255,255,0.4)',
                border: filter === f ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Bookings list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div
              className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#3b82f6' }}
            />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🎧</div>
            <p className="font-semibold text-base" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}
            </p>
            {filter === 'all' && (
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Add a client to get started
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            loadBookings();
          }}
        />
      )}
    </div>
  );
}
