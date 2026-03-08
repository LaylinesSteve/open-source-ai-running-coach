'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RevisionForm({ planId, hasWeeksData }: { planId: string; hasWeeksData: boolean }) {
  const router = useRouter();
  const [request, setRequest] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = request.trim();
    if (!text) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/plan/${planId}/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Revision failed');
        setLoading(false);
        return;
      }
      setRequest('');
      router.refresh();
    } catch {
      setError('Something went wrong');
    }
    setLoading(false);
  };

  if (!hasWeeksData) return null;

  return (
    <section
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '3rem 1.5rem',
        background: '#141414',
        borderTop: '1px solid #262626',
      }}
    >
      <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#e85d04', marginBottom: '0.5rem' }}>
        Ask for revisions
      </p>
      <p style={{ color: '#a3a3a3', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Describe what you’d like to change (e.g. less mileage, more trail focus, different long-run day). The coach will update your plan.
      </p>
      <form onSubmit={submit}>
        <textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder="e.g. I’d like to keep weekly mileage under 35 and add a midweek medium-long run."
          rows={3}
          required
          style={{
            width: '100%',
            padding: '12px 16px',
            background: '#0a0a0a',
            border: '1px solid #262626',
            borderRadius: 8,
            color: '#f5f5f5',
            fontSize: 16,
            marginBottom: 12,
            resize: 'vertical',
          }}
        />
        {error && <p style={{ color: '#e85d04', fontSize: '0.85rem', marginBottom: 12 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 20px',
            background: '#e85d04',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
          }}
        >
          {loading ? 'Updating plan…' : 'Request revision'}
        </button>
      </form>
    </section>
  );
}
