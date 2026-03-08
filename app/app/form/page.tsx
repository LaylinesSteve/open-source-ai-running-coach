'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RACE_DISTANCE_OPTIONS } from '@/lib/race-distances';

function FormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [raceUrl, setRaceUrl] = useState('');
  const [raceName, setRaceName] = useState('');
  const [raceDate, setRaceDate] = useState('');
  const [distance, setDistance] = useState('Marathon');
  const [goal, setGoal] = useState('');
  const [targetTime, setTargetTime] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'strava_denied') setError('Strava authorization was cancelled.');
    if (err === 'strava_failed') setError('Strava connection failed. Try again.');
  }, [searchParams]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/plan/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raceUrl: raceUrl.trim(),
          raceName: raceName.trim() || 'Marathon',
          raceDate: raceDate.trim(),
          distance: distance || 'Marathon',
          goal: goal.trim() || undefined,
          targetTime: targetTime.trim() || undefined,
          additionalInfo: additionalInfo.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to create plan');
        setLoading(false);
        return;
      }
      const planId = data.planId;
      // Optional: redirect to Strava to connect, then callback will go to plan page
      const connectStrava = (e.target as HTMLFormElement).querySelector<HTMLInputElement>('[name=connectStrava]')?.checked;
      if (connectStrava) {
        window.location.href = `/api/auth/strava?state=${planId}`;
        return;
      }
      router.push(`/app/plan/${planId}`);
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
      <div style={{ width: '100%', maxWidth: 420 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 8 }}>
          Your race plan
        </h1>
        <p style={{ color: '#737373', fontSize: '0.9rem', marginBottom: 24 }}>
          We’ll generate a training plan for your race distance and date.
        </p>
        <form onSubmit={submit}>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
            Race name
          </label>
          <input
            type="text"
            value={raceName}
            onChange={(e) => setRaceName(e.target.value)}
            placeholder="e.g. Trail 50K"
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
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
            Race date <span style={{ color: '#e85d04' }}>*</span>
          </label>
          <input
            type="date"
            value={raceDate}
            onChange={(e) => setRaceDate(e.target.value)}
            required
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
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
            Race distance
          </label>
          <select
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
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
          >
            {RACE_DISTANCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
            Link to race (optional)
          </label>
          <input
            type="url"
            value={raceUrl}
            onChange={(e) => setRaceUrl(e.target.value)}
            placeholder="https://..."
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
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
            Why are you running?
          </label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
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
          >
            <option value="">Select a goal (optional)</option>
            <option value="Finish strong / have fun">Finish strong / have fun</option>
            <option value="First 50K">First 50K</option>
            <option value="PR / time goal">PR / time goal</option>
            <option value="Qualify for longer race">Qualify for longer race</option>
            <option value="Stay consistent">Stay consistent</option>
            <option value="Other">Other</option>
          </select>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
            Target time (optional)
          </label>
          <input
            type="text"
            value={targetTime}
            onChange={(e) => setTargetTime(e.target.value)}
            placeholder="e.g. under 7 hours, 6:30"
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
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
            Anything else we should know?
          </label>
          <textarea
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            placeholder="Injuries, terrain preference, weekly schedule, etc."
            rows={3}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#141414',
              border: '1px solid #262626',
              borderRadius: 8,
              color: '#f5f5f5',
              fontSize: 16,
              marginBottom: 20,
              resize: 'vertical',
            }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <input type="checkbox" name="connectStrava" />
            <span style={{ fontSize: '0.9rem' }}>Connect Strava (personalize from your activity)</span>
          </label>
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
            {loading ? 'Creating…' : 'Generate my plan'}
          </button>
        </form>
        <p style={{ marginTop: 20, fontSize: '0.8rem', color: '#737373' }}>
          <a href="/app" style={{ color: '#737373' }}>Back</a>
          {' · '}
          <a href="/training-plan.html" style={{ color: '#e85d04' }}>Example plan</a>
        </p>
      </div>
    </div>
  );
}

export default function FormPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#737373', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>}>
      <FormContent />
    </Suspense>
  );
}
