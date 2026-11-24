import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getPlan } from '@/lib/store';
import { canAccessPlan } from '@/lib/auth';
import { getStrengthWorkout } from '@/lib/strength';
import StrengthTracker from './StrengthTracker';

/** The session log changes while the page is open, so never serve it from cache. */
export const dynamic = 'force-dynamic';

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

  const workout = getStrengthWorkout(workoutId) ?? getStrengthWorkout();
  if (!workout) redirect(`/app/plan/${id}`);
  const sessions = (plan.strengthLog ?? []).filter((s) => s.workoutId === workout.id);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f5f5' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '1rem 1rem 0' }}>
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
      <StrengthTracker planId={id} workout={workout} sessions={sessions} planLabel={plan.raceName} />
    </div>
  );
}
