import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getPlan } from '@/lib/store';
import { canAccessPlan } from '@/lib/auth';
import { findWorkout, workoutsForPlan } from '@/lib/strength';
import StrengthTracker from './StrengthTracker';

/** The session log changes while the page is open, so never serve it from cache. */
export const dynamic = 'force-dynamic';

const chip = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 40,
  padding: '0 14px',
  borderRadius: 999,
  fontSize: '0.9rem',
  textDecoration: 'none',
  fontWeight: 600,
} as const;

export default async function StrengthPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workout?: string }>;
}) {
  const { id } = await params;
  const { workout: workoutId } = await searchParams;
  if (!(await canAccessPlan(id))) {
    redirect(`/app/unlock?next=${encodeURIComponent(`/app/plan/${id}/strength`)}`);
  }
  const plan = await getPlan(id);
  if (!plan) redirect('/app/form');

  const workouts = workoutsForPlan(plan.strengthWorkouts);
  const log = plan.strengthLog ?? [];
  // No workout asked for: open the one logged most recently, else the first in the list.
  const lastLogged = log.length ? log.reduce((a, b) => (b.date >= a.date ? b : a)).workoutId : null;
  const workout =
    findWorkout(plan.strengthWorkouts, workoutId) ?? findWorkout(plan.strengthWorkouts, lastLogged) ?? workouts[0];
  if (!workout) redirect(`/app/plan/${id}`);
  const sessions = log.filter((s) => s.workoutId === workout.id);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f5f5' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '1rem 1rem 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
          <Link href={`/app/plan/${id}`} style={{ ...chip, borderRadius: 8, background: '#262626', color: '#f5f5f5', fontWeight: 500 }}>
            ← Back to plan
          </Link>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Link
              href={`/app/plan/${id}/strength/edit?workout=${encodeURIComponent(workout.id)}`}
              style={{ ...chip, borderRadius: 8, border: '1px solid #404040', color: '#f5f5f5' }}
            >
              Edit workout
            </Link>
            <Link href={`/app/plan/${id}/strength/edit`} style={{ ...chip, borderRadius: 8, background: '#e85d04', color: '#fff' }}>
              New workout
            </Link>
          </div>
        </div>
        {workouts.length > 1 && (
          <nav aria-label="Workouts" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {workouts.map((w) => {
              const active = w.id === workout.id;
              return (
                <Link
                  key={w.id}
                  href={`/app/plan/${id}/strength?workout=${encodeURIComponent(w.id)}`}
                  aria-current={active ? 'page' : undefined}
                  style={{
                    ...chip,
                    border: `1px solid ${active ? '#f5f5f5' : '#404040'}`,
                    background: active ? '#f5f5f5' : 'transparent',
                    color: active ? '#0a0a0a' : '#a3a3a3',
                  }}
                >
                  {w.title}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
      {/* Keyed by workout so switching workouts loads that workout's session instead of reusing this one's state. */}
      <StrengthTracker key={workout.id} planId={id} workout={workout} sessions={sessions} planLabel={plan.raceName} />
    </div>
  );
}
