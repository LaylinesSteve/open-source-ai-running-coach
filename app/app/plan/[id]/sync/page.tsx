import { redirect } from 'next/navigation';
import { getPlan } from '@/lib/store';
import Link from 'next/link';
import SyncButton from './SyncButton';
import AddRunButton from '../AddRunButton';
import AdaptButton from '../AdaptButton';

function formatDuration(sec?: number): string {
  if (sec == null) return '';
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m} min`;
}

export default async function SyncPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plan = await getPlan(id);
  if (!plan) redirect('/app/form');

  const hasStrava = !!plan.stravaRefreshToken;
  const syncResult = plan.syncResult;
  const lastSyncAt = plan.lastSyncAt;
  const runLog = (plan.runLog ?? []).slice().sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#f5f5f5',
        padding: '2rem 1.5rem',
        maxWidth: 720,
        margin: '0 auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link
          href={`/app/plan/${id}`}
          style={{
            display: 'inline-block',
            padding: '10px 18px',
            background: '#262626',
            color: '#f5f5f5',
            borderRadius: 8,
            fontSize: '0.9rem',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          ← Back to plan
        </Link>
      </div>
      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', letterSpacing: '0.02em', marginBottom: '0.5rem' }}>
        Training log
      </h1>
      <p style={{ color: '#a3a3a3', fontSize: '0.95rem', marginBottom: '2rem' }}>
        All runs synced from Strava appear here and in your plan's weekly view. Sync to pull in new activities.
      </p>

      {!hasStrava && (
        <p style={{ color: '#737373', marginBottom: '1rem' }}>This plan doesn't have Strava connected. You can still add runs manually below.</p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: '1rem' }}>
        {hasStrava && <SyncButton planId={id} />}
        <AddRunButton planId={id} />
        <AdaptButton planId={id} />
      </div>
      {hasStrava && lastSyncAt && syncResult && (
            <p style={{ marginBottom: '1rem', color: '#737373', fontSize: '0.9rem' }}>
              Last synced {new Date(lastSyncAt).toLocaleString()} — {syncResult.summary}
            </p>
      )}

          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '2.5rem', marginBottom: '0.75rem' }}>Run log</h2>
          {runLog.length === 0 ? (
            <p style={{ color: '#737373', fontSize: '0.9rem' }}>No runs yet. Sync Strava or add a run above.</p>
          ) : (
            <div style={{ background: '#141414', border: '1px solid #262626', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #262626' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: '#737373', fontWeight: 500 }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: '#737373', fontWeight: 500 }}>Week</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: '#737373', fontWeight: 500 }}>Run</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem', color: '#737373', fontWeight: 500 }}>Distance</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem', color: '#737373', fontWeight: 500 }}>Time</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem', color: '#737373', fontWeight: 500 }}>RPE</th>
                  </tr>
                </thead>
                <tbody>
                  {runLog.map((r, i) => (
                    <tr key={r.stravaId !== 0 ? r.stravaId : `manual-${r.date}-${i}`} style={{ borderBottom: '1px solid #262626' }}>
                      <td style={{ padding: '0.75rem', color: '#a3a3a3' }}>{r.dayLabel}</td>
                      <td style={{ padding: '0.75rem' }}>{r.weekNum}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ color: '#f5f5f5' }}>{r.name}</span>
                        {r.note && <span style={{ display: 'block', fontSize: '0.8rem', color: '#737373', marginTop: 2 }}>{r.note}</span>}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#22c55e' }}>{r.distanceMi} mi</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#a3a3a3' }}>{formatDuration(r.movingTimeSec)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#a3a3a3' }}>{r.perceivedIntensity != null ? r.perceivedIntensity : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
    </div>
  );
}
