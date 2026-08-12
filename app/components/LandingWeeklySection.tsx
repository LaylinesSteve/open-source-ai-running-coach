'use client';

import { useCallback, useState } from 'react';
import WeeklyStravaRecap from '@/app/components/WeeklyStravaRecap';
import { DEMO_WEEKS } from '@/lib/weekly-data';

type Props = {
  visible?: boolean;
};

export default function LandingWeeklySection({ visible = true }: Props) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onConnect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch('/api/weekly/connect', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.authUrl) {
        setError(json.error || 'Could not start Strava connection.');
        setConnecting(false);
        return;
      }
      window.location.href = json.authUrl;
    } catch {
      setError('Could not start Strava connection.');
      setConnecting(false);
    }
  }, []);

  return (
    <section
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.65s ease, transform 0.65s ease',
      }}
    >
      {error && (
        <p
          style={{
            margin: '0 auto',
            maxWidth: 520,
            padding: '0 16px 8px',
            textAlign: 'center',
            color: '#ff6b5b',
            fontSize: 14,
          }}
        >
          {error}
        </p>
      )}
      <WeeklyStravaRecap
        weeks={DEMO_WEEKS}
        athleteName="Maya Okonkwo"
        initials="MO"
        connected={false}
        connecting={connecting}
        onConnect={onConnect}
        compact
        headerExtra={
          <>
            <p
              style={{
                margin: 0,
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#6d6f6a',
              }}
            >
              New · Weekly Strava summary
            </p>
            <h2
              style={{
                margin: '6px 0 0',
                fontFamily: "'Archivo', 'Syne', system-ui, sans-serif",
                fontSize: 'clamp(1.5rem, 4vw, 1.85rem)',
                fontWeight: 800,
                color: '#f6f6f3',
                letterSpacing: '-0.02em',
              }}
            >
              Your week at a glance
            </h2>
          </>
        }
      />
      <p style={{ textAlign: 'center', margin: '0 0 48px', padding: '0 16px' }}>
        <a
          href="/app/weekly"
          style={{
            color: '#ff7a33',
            fontSize: 14,
            textDecoration: 'none',
            letterSpacing: '0.04em',
          }}
        >
          Open full weekly view →
        </a>
      </p>
    </section>
  );
}
