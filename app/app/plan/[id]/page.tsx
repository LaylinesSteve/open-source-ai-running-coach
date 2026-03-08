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
import PlanSummary from './PlanSummary';
import RevisionForm from './RevisionForm';

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

  const distance = plan.distance || 'Marathon';

  let html = plan.generatedHtml;
  let stravaSummaryText = plan.stravaSummaryText;
  let coachSummary = plan.coachSummary;
  let weeksData = plan.weeksData;

  if (!html) {
    let weeks = generatePlanWeeks(new Date(plan.raceDate + 'T12:00:00'), distance);

    if (plan.stravaRefreshToken && process.env.GEMINI_API_KEY) {
      try {
        const accessToken = await getAccessTokenForPlan(plan);
        if (accessToken) {
          const activities = await fetchStravaActivities(accessToken);
          const stravaSummary = buildStravaSummary(activities);
          stravaSummaryText = stravaSummary;
          const result = await generatePlanWithAI(plan, stravaSummary);
          weeks = result.weeks;
          coachSummary = result.coachSummary || undefined;
        }
      } catch {
        weeks = generatePlanWeeks(new Date(plan.raceDate + 'T12:00:00'), distance);
      }
    }

    html = planWeeksToHtml(weeks, plan.raceName, plan.raceDate, plan.raceUrl, distance);
    weeksData = weeks;
    const { updatePlan } = await import('@/lib/store');
    await updatePlan(id, {
      generatedHtml: html,
      stravaSummaryText: stravaSummaryText || undefined,
      coachSummary: coachSummary || undefined,
      weeksData,
    });
  }

  const hasSummary = stravaSummaryText || plan.goal || plan.targetTime || plan.additionalInfo || coachSummary;

  return (
    <>
      {hasSummary && (
        <PlanSummary
          stravaSummaryText={stravaSummaryText}
          goal={plan.goal}
          targetTime={plan.targetTime}
          additionalInfo={plan.additionalInfo}
          coachSummary={coachSummary}
          raceName={plan.raceName}
          distance={distance}
        />
      )}
      <PlanView html={html} planId={id} />
      <RevisionForm planId={id} hasWeeksData={!!weeksData} />
    </>
  );
}
