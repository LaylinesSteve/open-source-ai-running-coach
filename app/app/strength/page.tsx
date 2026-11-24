import type { Metadata } from 'next';
import Link from 'next/link';
import { STRENGTH_WORKOUTS } from '@/lib/strength';
import StrengthTracker from '@/app/app/plan/[id]/strength/StrengthTracker';

export const metadata: Metadata = {
  title: 'Strength session tracker',
  description:
    'A strength session tracker for runners to use mid-workout: tap sets off, log reps and weight, run rest timers, and save a summary image for Strava.',
};

/** Try-it page linked from the home page card. No plan, so nothing is sent to the server. */
export default function TryStrengthPage() {
  const workout = STRENGTH_WORKOUTS[0];
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f5f5' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '1rem 1rem 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Link
          href="/"
          style={{
            alignSelf: 'flex-start',
            padding: '10px 18px',
            background: '#262626',
            color: '#f5f5f5',
            borderRadius: 8,
            fontSize: '0.9rem',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          ← Home
        </Link>
        <p style={{ margin: 0, color: '#a3a3a3', fontSize: '0.95rem', lineHeight: 1.5 }}>
          You&apos;re trying the tracker with a built-in workout. This session is saved on this device only.{' '}
          <Link href="/app/form" style={{ color: '#e85d04' }}>
            Create a plan
          </Link>{' '}
          to keep a history and build your own workouts.
        </p>
      </div>
      <StrengthTracker workout={workout} sessions={[]} />
    </div>
  );
}
