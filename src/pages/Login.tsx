import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(authError.message || 'Invalid credentials.');
      setLoading(false);
      return;
    }

    navigate('/dashboard', { replace: true });
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#0a0a0f' }}
    >
      {/* Background glow */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: '-20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          background: '#12121a',
          border: '1px solid rgba(255,255,255,0.08)',
          position: 'relative',
        }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/icons/icon-512.png"
            alt="DJ KJ"
            className="mx-auto mb-2"
            style={{ width: '160px', height: '160px', objectFit: 'contain' }}
          />
          <p
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Rajdhani, sans-serif' }}
          >
            Booking Manager
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              className="block text-sm font-semibold mb-1.5"
              style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Rajdhani, sans-serif' }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label
              className="block text-sm font-semibold mb-1.5"
              style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Rajdhani, sans-serif' }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div
              className="rounded-lg p-3 text-sm font-medium"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444',
                fontFamily: 'Rajdhani, sans-serif',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-base mt-2"
            style={{
              background: loading
                ? 'rgba(59,130,246,0.5)'
                : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: '#fff',
              fontFamily: 'Rajdhani, sans-serif',
              letterSpacing: '0.05em',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p
          className="text-center text-xs mt-6"
          style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'Rajdhani, sans-serif' }}
        >
          DJ KJ · Pflugerville, TX
        </p>
      </div>
    </div>
  );
}
