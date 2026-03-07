import { redirect } from 'next/navigation';
import { hasAccess } from '@/lib/auth';
import { getPlan } from '@/lib/store';
import { generatePlanWeeks, planWeeksToHtml } from '@/lib/plan-generator';
import PlanView from './PlanView';

export default async function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plan = await getPlan(id);
  if (!plan) {
    redirect('/app/form');
  }

  let html = plan.generatedHtml;
  if (!html) {
    const raceDate = new Date(plan.raceDate + 'T12:00:00');
    const weeks = generatePlanWeeks(raceDate);
    html = planWeeksToHtml(weeks, plan.raceName, plan.raceDate, plan.raceUrl);
    const { updatePlan } = await import('@/lib/store');
    await updatePlan(id, { generatedHtml: html });
  }

  return <PlanView html={html} planId={id} />;
}
