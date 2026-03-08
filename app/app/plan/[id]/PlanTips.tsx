import type { PlanTip } from '@/lib/ai-plan';
import { getDefaultTips } from '@/lib/default-tips';

export default function PlanTips({
  tips,
  distance,
}: {
  tips?: PlanTip[] | null;
  distance: string;
}) {
  const list = (tips && tips.length > 0 ? tips : getDefaultTips(distance)).slice(0, 8);
  if (list.length === 0) return null;

  return (
    <section
      style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '4rem 1.5rem',
        background: '#0a0a0a',
      }}
    >
      <p
        style={{
          fontSize: '0.7rem',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: '#e85d04',
          marginBottom: '0.5rem',
        }}
      >
        For you
      </p>
      <h2
        style={{
          fontFamily: '"Bebas Neue", sans-serif',
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          letterSpacing: '0.02em',
          marginBottom: '2rem',
        }}
      >
        Tips
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}
      >
        {list.map((tip, i) => (
          <div
            key={i}
            style={{
              background: '#141414',
              border: '1px solid #262626',
              borderRadius: 8,
              padding: '1.25rem',
              fontSize: '0.9rem',
              color: '#a3a3a3',
            }}
          >
            <strong style={{ color: '#f5f5f5', display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
              {tip.title}
            </strong>
            <span>{tip.description}</span>
            {tip.url && (
              <a
                href={tip.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', marginTop: '0.5rem', color: '#e85d04', fontSize: '0.8rem', textDecoration: 'none' }}
              >
                Learn more →
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
