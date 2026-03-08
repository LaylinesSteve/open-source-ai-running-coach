export default function PlanSummary({
  stravaSummaryText,
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

      {stravaSummaryText && (
        <section style={sectionStyle}>
          <p style={labelStyle}>Recent training (Strava)</p>
          <p style={textStyle}>{stravaSummaryText}</p>
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
