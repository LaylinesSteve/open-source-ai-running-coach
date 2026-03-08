'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SyncButton({ planId }: { planId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runSync = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/plan/${planId}/sync`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Sync failed');
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError('Something went wrong');
    }
    setLoading(false);
  };

  return (
    <div>
      <button
        type="button"
        onClick={runSync}
        disabled={loading}
        style={{
          padding: '12px 24px',
          background: '#e85d04',
          border: 'none',
          borderRadius: 8,
          color: '#fff',
          fontWeight: 600,
          fontSize: '1rem',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Syncing…' : 'Update with recent Strava training'}
      </button>
      {error && <p style={{ color: '#e85d04', marginTop: '0.5rem', fontSize: '0.9rem' }}>{error}</p>}
    </div>
  );
}
