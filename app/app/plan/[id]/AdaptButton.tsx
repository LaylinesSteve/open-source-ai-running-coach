'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdaptButton({ planId }: { planId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/plan/${planId}/adapt`, { method: 'POST' });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={loading}
      style={{
        display: 'inline-block',
        padding: '12px 20px',
        background: '#262626',
        border: '1px solid #404040',
        color: '#f5f5f5',
        fontWeight: 600,
        borderRadius: 8,
        fontSize: '0.9rem',
        cursor: loading ? 'not-allowed' : 'pointer',
      }}
    >
      {loading ? 'Updating…' : 'Update coach advice'}
    </button>
  );
}
