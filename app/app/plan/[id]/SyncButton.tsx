'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type AdaptationPayload =
  | { ok: true }
  | { ok: false; error?: string; skipped?: string };

export default function SyncButton({
  planId,
  variant = 'primary',
  embedded = false,
}: {
  planId: string;
  variant?: 'primary' | 'sticky';
  /** When true with sticky variant, omit fixed positioning (parent bar handles layout). */
  embedded?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warn, setWarn] = useState('');

  const isSticky = variant === 'sticky';

  const runSync = async () => {
    setError('');
    setWarn('');
    setLoading(true);
    try {
      const res = await fetch(`/api/plan/${planId}/sync`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Sync failed');
        setLoading(false);
        return;
      }
      const adaptation = data.adaptation as AdaptationPayload | undefined;
      if (adaptation && !adaptation.ok && adaptation.error) {
        setWarn(`Synced, but coach advice didn’t refresh: ${adaptation.error}`);
      }
      router.refresh();
    } catch {
      setError('Something went wrong');
    }
    setLoading(false);
  };

  const button = (
    <button
      type="button"
      onClick={runSync}
      disabled={loading}
      className={isSticky ? 'plan-sync-strava-sticky' : undefined}
      style={
        isSticky
          ? {
              cursor: loading ? 'not-allowed' : 'pointer',
            }
          : {
              padding: '12px 24px',
              background: '#e85d04',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
            }
      }
    >
      {loading ? '…' : isSticky ? 'Sync' : 'Update with recent Strava training'}
    </button>
  );

  if (isSticky) {
    const content = (
      <>
        {button}
        {(error || warn) && (
          <p
            className="plan-sticky-actions-feedback"
            style={{
              color: error ? '#e85d04' : '#a3a3a3',
            }}
          >
            {error || warn}
          </p>
        )}
      </>
    );
    if (embedded) return <div className="plan-sticky-actions-item">{content}</div>;
    return (
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 10 }}>
        {content}
      </div>
    );
  }

  return (
    <div>
      {button}
      {error && <p style={{ color: '#e85d04', marginTop: '0.5rem', fontSize: '0.9rem' }}>{error}</p>}
      {warn && !error && <p style={{ color: '#a3a3a3', marginTop: '0.5rem', fontSize: '0.85rem' }}>{warn}</p>}
    </div>
  );
}
