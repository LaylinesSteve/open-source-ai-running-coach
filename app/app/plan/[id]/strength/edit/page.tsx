import { redirect } from 'next/navigation';
import { getPlan } from '@/lib/store';
import { canAccessPlan } from '@/lib/auth';
import { findWorkout, isBuiltInWorkout } from '@/lib/strength';
import WorkoutEditor from './WorkoutEditor';

export const dynamic = 'force-dynamic';

export default async function EditWorkoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workout?: string }>;
}) {
  const { id } = await params;
  const { workout: workoutId } = await searchParams;
  if (!(await canAccessPlan(id))) {
    redirect(`/app/unlock?next=${encodeURIComponent(`/app/plan/${id}/strength/edit`)}`);
  }
  const plan = await getPlan(id);
  if (!plan) redirect('/app/form');

  // No ?workout= starts a blank workout. A built-in opens as a copy, since built-ins can't be changed.
  const source = findWorkout(plan.strengthWorkouts, workoutId);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f5f5' }}>
      <WorkoutEditor
        planId={id}
        initial={source}
        isOwn={!!source && !isBuiltInWorkout(source.id)}
        aiEnabled={!!process.env.GEMINI_API_KEY}
      />
    </div>
  );
}
