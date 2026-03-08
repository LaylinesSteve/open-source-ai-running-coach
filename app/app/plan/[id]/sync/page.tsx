import { redirect } from 'next/navigation';
import { getPlan } from '@/lib/store';
import Link from 'next/link';
import SyncButton from './SyncButton';

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
      <p style={{ marginBottom: '0.5rem' }}>
        <Link href={`/app/plan/${id}`} style={{ color: '#737373', fontSize: '0.9rem' }}>
          ← Back to plan
        </Link>
      </p>
      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', letterSpacing: '0.02em', marginBottom: '0.5rem' }}>
        Training log
      </h1>
      <p style={{ color: '#a3a3a3', fontSize: '0.95rem', marginBottom: '2rem' }}>
        Compare your recent Strava runs to your plan. We’ll match activities by date and show what you’ve completed.
      </p>

      {!hasStrava ? (
        <p style={{ color: '#737373' }}>This plan doesn’t have Strava connected. Connect Strava when creating a plan to use this feature.</p>
      ) : (
        <>
          <SyncButton planId={id} />
          {lastSyncAt && syncResult && (
            <div style={{ marginTop: '2rem' }}>
              <p style={{ color: '#e85d04', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Last synced {new Date(lastSyncAt).toLocaleString()}
              </p>
              <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{syncResult.summary}</p>
              {syncResult.completed.length > 0 && (
                <div style={{ background: '#141414', border: '1px solid #262626', borderRadius: 8, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #262626' }}>
                        <th style={{ textAlign: 'left', padding: '0.75rem', color: '#737373', fontWeight: 500 }}>Week</th>
                        <th style={{ textAlign: 'left', padding: '0.75rem', color: '#737373', fontWeight: 500 }}>Day</th>
                        <th style={{ textAlign: 'left', padding: '0.75rem', color: '#737373', fontWeight: 500 }}>Planned</th>
                        <th style={{ textAlign: 'right', padding: '0.75rem', color: '#737373', fontWeight: 500 }}>Actual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {syncResult.completed.slice(-20).reverse().map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #262626' }}>
                          <td style={{ padding: '0.75rem' }}>{r.weekNum}</td>
                          <td style={{ padding: '0.75rem', color: '#a3a3a3' }}>{r.dayLabel}</td>
                          <td style={{ padding: '0.75rem' }}>{r.planned}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: '#22c55e' }}>{r.actualMi} mi</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
