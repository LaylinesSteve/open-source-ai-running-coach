'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddRunButton({ planId }: { planId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [miles, setMiles] = useState('');
  const [minutes, setMinutes] = useState('');
  const [intensity, setIntensity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const distanceMi = parseFloat(miles);
    if (!date || !Number.isFinite(distanceMi) || distanceMi <= 0) {
      setError('Please enter date and mileage.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const movingTimeSec = minutes.trim() ? Math.round(parseFloat(minutes) * 60) : undefined;
      const perceivedIntensity = intensity.trim() ? Math.min(10, Math.max(1, Math.round(parseFloat(intensity)))) : undefined;
      const res = await fetch(`/api/plan/${planId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: date.slice(0, 10),
          distanceMi,
          movingTimeSec,
          perceivedIntensity,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to add run');
        setLoading(false);
        return;
      }
      setOpen(false);
      setDate('');
      setMiles('');
      setMinutes('');
      setIntensity('');
      router.refresh();
    } catch {
      setError('Something went wrong');
    }
    setLoading(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-block',
          padding: '12px 20px',
          background: '#262626',
          border: '1px solid #404040',
          color: '#f5f5f5',
          fontWeight: 600,
          borderRadius: 8,
          fontSize: '0.9rem',
          cursor: 'pointer',
        }}
      >
        Add run
      </button>
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: 16,
          }}
          onClick={() => !loading && setOpen(false)}
        >
          <div
            style={{
              background: '#141414',
              border: '1px solid #262626',
              borderRadius: 12,
              padding: '1.5rem',
              maxWidth: 400,
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Add run</h3>
            <form onSubmit={submit}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#a3a3a3', marginBottom: 4 }}>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#0a0a0a',
                  border: '1px solid #262626',
                  borderRadius: 6,
                  color: '#f5f5f5',
                  marginBottom: 12,
                }}
              />
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#a3a3a3', marginBottom: 4 }}>Mileage</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={miles}
                onChange={(e) => setMiles(e.target.value)}
                placeholder="e.g. 5.2"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#0a0a0a',
                  border: '1px solid #262626',
                  borderRadius: 6,
                  color: '#f5f5f5',
                  marginBottom: 12,
                }}
              />
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#a3a3a3', marginBottom: 4 }}>Time (minutes, optional)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="e.g. 45"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#0a0a0a',
                  border: '1px solid #262626',
                  borderRadius: 6,
                  color: '#f5f5f5',
                  marginBottom: 12,
                }}
              />
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#a3a3a3', marginBottom: 4 }}>Perceived intensity (1–10, optional)</label>
              <select
                value={intensity}
                onChange={(e) => setIntensity(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#0a0a0a',
                  border: '1px solid #262626',
                  borderRadius: 6,
                  color: '#f5f5f5',
                  marginBottom: 12,
                }}
              >
                <option value="">—</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              {error && <p style={{ color: '#e85d04', fontSize: '0.85rem', marginBottom: 12 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => !loading && setOpen(false)}
                  style={{
                    padding: '10px 16px',
                    background: 'transparent',
                    border: '1px solid #404040',
                    borderRadius: 6,
                    color: '#a3a3a3',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '10px 16px',
                    background: '#e85d04',
                    border: 'none',
                    borderRadius: 6,
                    color: '#fff',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  {loading ? 'Adding…' : 'Add run'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
