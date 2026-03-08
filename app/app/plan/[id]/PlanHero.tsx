export default function PlanHero({
  athleteName,
  distance,
  raceDate,
  weeks,
  raceUrl,
}: {
  athleteName: string;
  distance: string;
  raceDate: string;
  weeks: number;
  raceUrl?: string;
}) {
  const raceDateObj = new Date(raceDate + 'T12:00:00');
  const raceDateFormatted = raceDateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const startDateObj = new Date(raceDateObj);
  startDateObj.setDate(startDateObj.getDate() - (weeks - 1) * 7);
  const startDate = startDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endDate = raceDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <header
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '2rem',
        background: 'radial-gradient(ellipse 80% 50% at 50% 120%, rgba(232, 93, 4, 0.15) 0%, transparent 50%), #0a0a0a',
      }}
    >
      <h1
        style={{
          fontFamily: '"Bebas Neue", sans-serif',
          fontSize: 'clamp(3rem, 12vw, 8rem)',
          lineHeight: 0.95,
          marginBottom: '0.5rem',
          letterSpacing: '0.02em',
        }}
      >
        {distance}
      </h1>
      <p
        style={{
          fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
          color: '#737373',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          marginBottom: '1rem',
        }}
      >
        {athleteName || 'Trail'}
      </p>
      <p
        style={{
          fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
          color: '#e85d04',
          fontFamily: '"Bebas Neue", sans-serif',
          letterSpacing: '0.02em',
        }}
      >
        {raceDateFormatted}
      </p>
      <p
        style={{
          marginTop: '2rem',
          padding: '0.5rem 1rem',
          border: '1px solid #262626',
          fontSize: '0.75rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#737373',
        }}
      >
        {weeks} Week{weeks === 1 ? '' : 's'} · {startDate} → {endDate}
      </p>
      {raceUrl && (
        <a
          href={raceUrl}
          target="_blank"
          rel="noopener"
          style={{ color: '#e85d04', fontSize: '0.85rem', marginTop: '1rem' }}
        >
          Race info
        </a>
      )}
    </header>
  );
}
