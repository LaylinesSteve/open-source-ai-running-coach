import { redirect } from 'next/navigation';
import { getPlan } from '@/lib/store';
import { generatePlanWeeks, planWeeksToHtml } from '@/lib/plan-generator';
import {
  getAccessTokenForPlan,
  buildStravaSummary,
  generatePlanWithAI,
} from '@/lib/ai-plan';
import { fetchStravaActivities } from '@/lib/strava';
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
    let weeks = generatePlanWeeks(new Date(plan.raceDate + 'T12:00:00'));

    if (plan.stravaRefreshToken && process.env.OPENAI_API_KEY) {
      try {
        const accessToken = await getAccessTokenForPlan(plan);
        if (accessToken) {
          const activities = await fetchStravaActivities(accessToken);
          const stravaSummary = buildStravaSummary(activities);
          weeks = await generatePlanWithAI(plan, stravaSummary);
        }
      } catch {
        weeks = generatePlanWeeks(new Date(plan.raceDate + 'T12:00:00'));
      }
    }

    html = planWeeksToHtml(weeks, plan.raceName, plan.raceDate, plan.raceUrl);
    const { updatePlan } = await import('@/lib/store');
    await updatePlan(id, { generatedHtml: html });
  }

  return <PlanView html={html} planId={id} />;
}
