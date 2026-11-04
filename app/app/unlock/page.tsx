'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';

function UnlockForm() {
  const next = useSearchParams().get('next') ?? '';
  // Only return to a known page on this site, never to a URL from the query string.
  const destination = /^\/app\/(plan|admin)\//.test(next) ? next : '/app';
  const [passkey, setPasskey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/passkey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey }),
      });
      if (res.ok) {
        window.location.assign(destination);
        return;
      }
      setError(
        res.status === 401
          ? 'That passkey is not right.'
          : res.status === 429
            ? 'Too many attempts. Wait 15 minutes and try again.'
            : 'Could not sign in. Try again.'
      );
    } catch {
      setError('Could not sign in. Try again.');
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <label htmlFor="passkey" style={{ color: '#a3a3a3', fontSize: '0.9rem' }}>
        Passkey
      </label>
      <input
        id="passkey"
        type="password"
        autoComplete="current-password"
        required
        value={passkey}
        onChange={(e) => setPasskey(e.target.value)}
        style={{
          padding: '0.75rem',
          borderRadius: 8,
          border: '1px solid #262626',
          background: '#141414',
          color: '#f5f5f5',
          fontSize: '1rem',
        }}
      />
      {error && (
        <p role="alert" style={{ color: '#f87171', fontSize: '0.9rem', margin: 0 }}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        style={{
          padding: '0.75rem',
          borderRadius: 8,
          border: 'none',
          background: '#f5f5f5',
          color: '#0a0a0a',
          fontWeight: 600,
          fontSize: '1rem',
          cursor: busy ? 'default' : 'pointer',
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? 'Checking…' : 'Continue'}
      </button>
    </form>
  );
}

export default function UnlockPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#f5f5f5',
        padding: '4rem 1.5rem',
        fontFamily: "'Syne', system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <h1
          style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: '1.75rem',
            letterSpacing: '0.02em',
            marginBottom: '0.5rem',
          }}
        >
          This page is private
        </h1>
        <p style={{ color: '#a3a3a3', marginBottom: '1.5rem' }}>
          Enter your passkey to open it.
        </p>
        <Suspense>
          <UnlockForm />
        </Suspense>
      </div>
    </div>
  );
}
