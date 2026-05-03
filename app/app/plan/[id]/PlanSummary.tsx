import type { LoggedRun } from '@/lib/store';
import { stravaActivityLabel } from '@/lib/strava';

function formatDuration(sec?: number): string {
  if (sec == null) return '';
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m} min`;
}

export default function PlanSummary({
  stravaSummaryText,
  runLog = [],
  goal,
  targetTime,
  additionalInfo,
  coachSummary,
  adaptationNote,
  adaptationAt,
  adaptationSuggestedWeeks,
  raceName,
  distance,
}: {
  stravaSummaryText?: string;
  runLog?: LoggedRun[];
  goal?: string;
  targetTime?: string;
  additionalInfo?: string;
  coachSummary?: string;
  adaptationNote?: string;
  adaptationAt?: string;
  adaptationSuggestedWeeks?: { weekNum: number; suggestedMiles?: string; note?: string }[];
  raceName: string;
  distance: string;
}) {
  const sectionStyle = {
    maxWidth: 720,
    margin: '0 auto',
    padding: '2rem 1.5rem',
    background: '#141414',
    borderBottom: '1px solid #262626',
  };
  const labelStyle = {
    fontSize: '0.7rem',
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    color: '#e85d04',
    marginBottom: '0.5rem',
  };
  const textStyle = { color: '#f5f5f5', fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' as const };
  const mutedStyle = { color: '#737373', fontSize: '0.9rem' };

  return (
    <div style={{ background: '#0a0a0a' }}>
      <section style={{ ...sectionStyle, paddingTop: '3rem' }}>
        <p style={labelStyle}>Your plan</p>
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', letterSpacing: '0.02em', marginBottom: '0.25rem' }}>
          {raceName}
        </h1>
        <p style={mutedStyle}>{distance} · Training summary & context</p>
      </section>

      {(runLog.length > 0 || stravaSummaryText) && (
        <section style={sectionStyle}>
          {runLog.length > 0 ? (
            <div style={{ margin: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <span style={labelStyle}>Recent training</span>
                <span style={{ ...mutedStyle, fontSize: '0.8rem' }}>
                  {runLog.length} activit{runLog.length === 1 ? 'y' : 'ies'} (this plan)
                </span>
              </div>
              {stravaSummaryText && <p style={{ ...textStyle, marginBottom: '1rem' }}>{stravaSummaryText}</p>}
              <div style={{ background: '#0a0a0a', border: '1px solid #262626', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #262626' }}>
                      <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: '#737373', fontWeight: 500 }}>Date</th>
                      <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: '#737373', fontWeight: 500 }}>Type</th>
                      <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: '#737373', fontWeight: 500 }}>Name</th>
                      <th style={{ textAlign: 'right', padding: '0.6rem 0.75rem', color: '#737373', fontWeight: 500 }}>Distance</th>
                      <th style={{ textAlign: 'right', padding: '0.6rem 0.75rem', color: '#737373', fontWeight: 500 }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runLog.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 25).map((r, i) => (
                      <tr key={r.stravaId !== 0 ? r.stravaId : `m-${r.date}-${i}`} style={{ borderBottom: '1px solid #262626' }}>
                        <td style={{ padding: '0.6rem 0.75rem', color: '#a3a3a3' }}>{r.dayLabel}</td>
                        <td style={{ padding: '0.6rem 0.75rem', color: '#e85d04', fontSize: '0.8rem' }}>
                          {r.activityType != null && r.activityType !== ''
                            ? stravaActivityLabel({ sport_type: r.activityType, type: r.activityType })
                            : 'Run'}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', color: '#f5f5f5' }}>{r.name}</td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', color: '#22c55e' }}>
                          {r.distanceMi > 0 ? `${r.distanceMi} mi` : '—'}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', color: '#a3a3a3' }}>{formatDuration(r.movingTimeSec)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {runLog.length > 25 && (
                  <p style={{ padding: '0.5rem 0.75rem', color: '#737373', fontSize: '0.8rem' }}>
                    + {runLog.length - 25} more activities — full list on the training log section below
                  </p>
                )}
              </div>
            </div>
          ) : (
            <details style={{ margin: 0 }}>
              <summary style={{ cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={labelStyle}>Recent training</span>
                <span style={{ ...mutedStyle, fontSize: '0.8rem' }}>Strava summary</span>
                <span style={{ marginLeft: 'auto', color: '#737373', fontSize: '0.75rem' }}>▼</span>
              </summary>
              <div style={{ marginTop: '1rem' }}>
                {stravaSummaryText && <p style={{ ...textStyle, marginBottom: 0 }}>{stravaSummaryText}</p>}
              </div>
            </details>
          )}
        </section>
      )}

      {(goal || targetTime || additionalInfo) && (
        <section style={sectionStyle}>
          <p style={labelStyle}>Context you provided</p>
          <div style={textStyle}>
            {goal && <p><strong>Goal:</strong> {goal}</p>}
            {targetTime && <p><strong>Target time:</strong> {targetTime}</p>}
            {additionalInfo && <p><strong>Notes:</strong> {additionalInfo}</p>}
          </div>
        </section>
      )}

      {coachSummary && (
        <section style={sectionStyle}>
          <p style={labelStyle}>Coach’s overview</p>
          <p style={textStyle}>{coachSummary}</p>
        </section>
      )}

      {adaptationNote && (
        <section style={sectionStyle}>
          <p style={labelStyle}>Coach's progress update</p>
          <p style={textStyle}>{adaptationNote}</p>
          {adaptationSuggestedWeeks && adaptationSuggestedWeeks.length > 0 && (
            <ul style={{ ...textStyle, marginTop: '0.75rem', paddingLeft: '1.25rem' }}>
              {adaptationSuggestedWeeks.map((w) => (
                <li key={w.weekNum}>
                  Week {w.weekNum}{w.suggestedMiles ? ` — ${w.suggestedMiles}` : ''}{w.note ? `: ${w.note}` : ''}
                </li>
              ))}
            </ul>
          )}
          {adaptationAt && (
            <p style={{ ...mutedStyle, marginTop: '0.5rem' }}>
              Updated {new Date(adaptationAt).toLocaleDateString()}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
