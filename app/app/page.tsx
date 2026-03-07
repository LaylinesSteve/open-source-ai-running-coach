'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PasskeyPage() {
  const router = useRouter();
  const [passkey, setPasskey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/passkey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey: passkey.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Invalid passkey');
        setLoading(false);
        return;
      }
      router.push('/app/form');
      router.refresh();
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 360 }}>
        <h1
          style={{
            fontFamily: 'system-ui',
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          AI Fitness Coach
        </h1>
        <p style={{ color: '#737373', fontSize: '0.9rem', marginBottom: 24 }}>
          Enter your passkey to create your training plan.
        </p>
        <form onSubmit={submit}>
          <input
            type="password"
            value={passkey}
            onChange={(e) => setPasskey(e.target.value)}
            placeholder="Passkey"
            autoComplete="off"
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#141414',
              border: '1px solid #262626',
              borderRadius: 8,
              color: '#f5f5f5',
              fontSize: 16,
              marginBottom: 16,
            }}
          />
          {error && (
            <p style={{ color: '#e85d04', fontSize: '0.85rem', marginBottom: 12 }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 12,
              background: '#e85d04',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Checking…' : 'Continue'}
          </button>
        </form>
        <p style={{ marginTop: 24, fontSize: '0.8rem', color: '#737373' }}>
          <a href="/training-plan.html" style={{ color: '#e85d04' }}>
            View example plan
          </a>
        </p>
      </div>
    </div>
  );
}
