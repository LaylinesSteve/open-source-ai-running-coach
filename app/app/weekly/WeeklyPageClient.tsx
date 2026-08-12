'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import WeeklyStravaRecap from '@/app/components/WeeklyStravaRecap';
import { DEMO_WEEKS, type WeeklySessionWeek } from '@/lib/weekly-session';
import { isSkinId, type SkinId } from '@/lib/weekly-skins';

const DEMO_NAME = 'Maya Okonkwo';
const DEMO_INITIALS = 'MO';

type LoadedState = {
  weeks: WeeklySessionWeek[];
  athleteName: string;
  initials: string;
  username?: string;
  connected: boolean;
  savedSkinId?: SkinId | null;
};

export default function WeeklyPageClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('id');
  const errorParam = searchParams.get('error');

  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(!!sessionId);
  const [error, setError] = useState<string | null>(() => {
    if (errorParam === 'strava_denied') return 'Strava authorization was cancelled.';
    if (errorParam === 'strava_failed') return 'Strava connection failed. Try again.';
    return null;
  });
  const [data, setData] = useState<LoadedState>({
    weeks: DEMO_WEEKS,
    athleteName: DEMO_NAME,
    initials: DEMO_INITIALS,
    connected: false,
    savedSkinId: null,
  });

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/weekly/${sessionId}`);
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || 'Could not load your Strava weeks.');
          setLoading(false);
          return;
        }
        setData({
          weeks: Array.isArray(json.weeks) && json.weeks.length > 0 ? json.weeks : DEMO_WEEKS,
          athleteName: json.athleteName || DEMO_NAME,
          initials: json.initials || DEMO_INITIALS,
          username: json.username,
          connected: true,
          savedSkinId: isSkinId(json.skinId) ? json.skinId : null,
        });
        if (!json.weeks?.length) {
          setError('Connected, but no running activities found in the last 6 months.');
        }
      } catch {
        if (!cancelled) setError('Could not load your Strava weeks.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

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
    <div style={{ minHeight: '100%', background: 'transparent' }}>
      {error && (
        <p
          style={{
            margin: 0,
            padding: '12px 16px',
            textAlign: 'center',
            background: 'rgba(255,107,91,0.12)',
            color: '#ff6b5b',
            fontSize: 14,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {error}
        </p>
      )}
      {loading ? (
        <p
          style={{
            margin: 0,
            padding: '80px 24px',
            textAlign: 'center',
            color: '#aeb0ac',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Loading your Strava weeks…
        </p>
      ) : (
        <WeeklyStravaRecap
          weeks={data.weeks}
          athleteName={data.athleteName}
          initials={data.initials}
          username={data.username}
          connected={data.connected}
          connecting={connecting}
          onConnect={onConnect}
          sessionId={sessionId}
          savedSkinId={data.savedSkinId}
        />
      )}
    </div>
  );
}
