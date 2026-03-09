import Link from 'next/link';
import { listAllPlansSummary } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default async function AdminPlansPage() {
  let plans: Awaited<ReturnType<typeof listAllPlansSummary>> = [];
  let error = '';
  try {
    plans = await listAllPlansSummary();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load plans';
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#f5f5f5',
        padding: '2rem 1.5rem',
        maxWidth: 900,
        margin: '0 auto',
        fontFamily: "'Syne', system-ui, sans-serif",
      }}
    >
      <Link
        href="/app"
        style={{ color: '#737373', fontSize: '0.9rem', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}
      >
        ← Back to app
      </Link>
      <h1
        style={{
          fontFamily: '"Bebas Neue", sans-serif',
          fontSize: '1.75rem',
          letterSpacing: '0.02em',
          marginBottom: '0.5rem',
        }}
      >
        Training plans
      </h1>
      <p style={{ color: '#737373', fontSize: '0.95rem', marginBottom: '2rem' }}>
        Plans created and runs logged. Click a plan to open it.
      </p>

      {error ? (
        <p style={{ color: '#e85d04' }}>{error}</p>
      ) : plans.length === 0 ? (
        <p style={{ color: '#737373' }}>No plans yet.</p>
      ) : (
        <div style={{ background: '#141414', border: '1px solid #262626', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #262626' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#737373', fontWeight: 600 }}>Name</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#737373', fontWeight: 600 }}>Race</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#737373', fontWeight: 600 }}>Date</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', color: '#737373', fontWeight: 600 }}>Runs logged</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#737373', fontWeight: 600 }}>Created</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#737373', fontWeight: 600 }}>Link</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #262626' }}>
                  <td style={{ padding: '0.75rem', color: '#f5f5f5' }}>{p.name}</td>
                  <td style={{ padding: '0.75rem', color: '#a3a3a3' }}>
                    {p.raceName}
                    {p.distance ? ` · ${p.distance}` : ''}
                  </td>
                  <td style={{ padding: '0.75rem', color: '#a3a3a3' }}>{p.raceDate}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: p.runsLogged > 0 ? '#22c55e' : '#737373' }}>
                    {p.runsLogged}
                  </td>
                  <td style={{ padding: '0.75rem', color: '#737373', fontSize: '0.85rem' }}>
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <Link
                      href={`/app/plan/${p.id}`}
                      style={{ color: '#e85d04', textDecoration: 'none', fontSize: '0.85rem' }}
                    >
                      Open plan →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: '1.5rem', color: '#525252', fontSize: '0.8rem' }}>
        {plans.length} plan{plans.length === 1 ? '' : 's'} total
      </p>
    </div>
  );
}
