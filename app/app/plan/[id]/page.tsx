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
import PlanHero from './PlanHero';
import PlanTips from './PlanTips';
import SyncSection from './SyncSection';
import RevisionForm from './RevisionForm';
import PlanWeeksPortal from './PlanWeeksPortal';
import WeekGoalCelebration from './WeekGoalCelebration';
import { mergeWeeksWithRunLog } from '@/lib/merge-runs';

/** Remove the hero block from stored plan HTML so we show our own hero first. */
function stripHeroFromPlanHtml(html: string): string {
  return html.replace(/<header class="hero">[\s\S]*?<\/header>\s*/i, '');
}

/** Empty the weeks grid so we render week cards in React (avoids innerHTML reset on expand). */
function stripWeeksGridContent(html: string): string {
  return html.replace(
    /(<div class="weeks-grid" id="weeksGrid">)\s*[\s\S]*?(\s*<\/div>\s*<\/section>\s*<section class="cta-section">)/,
    '$1\n    $2'
  );
}

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
  let tips = plan.tips;

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
          tips = result.tips?.length ? result.tips : undefined;
        }
      } catch {
        weeks = generatePlanWeeks(new Date(plan.raceDate + 'T12:00:00'), distance);
      }
    }

    html = planWeeksToHtml(weeks, plan.raceName, plan.raceDate, plan.raceUrl, distance);
    weeksData = weeks;
    const { updatePlan } = await import('@/lib/store');
    const now = new Date().toISOString();
    const coachSummaryHistory =
      coachSummary && coachSummary.trim()
        ? [{ at: now, summary: coachSummary.trim() }]
        : undefined;
    await updatePlan(id, {
      generatedHtml: html,
      stravaSummaryText: stravaSummaryText || undefined,
      coachSummary: coachSummary || undefined,
      weeksData,
      tips: tips || undefined,
      coachSummaryHistory,
    });
  }

  const hasSummary = stravaSummaryText || plan.goal || plan.targetTime || plan.additionalInfo || coachSummary || plan.adaptationNote;
  const baseHtml = stripHeroFromPlanHtml(html);
  const planContentHtml = weeksData ? stripWeeksGridContent(baseHtml) : baseHtml;
  const weeksRenderedByReact = weeksData && planContentHtml !== baseHtml; // only when strip actually removed content
  const numWeeks = plan.weeks || 12;
  const mergedWeeks = weeksData
    ? mergeWeeksWithRunLog(weeksData, plan.runLog ?? [], plan.raceDate, numWeeks)
    : undefined;

  return (
    <>
      <PlanHero
        athleteName={[plan.firstName, plan.lastName].filter(Boolean).join(' ') || 'Trail'}
        distance={distance}
        raceDate={plan.raceDate}
        weeks={numWeeks}
        raceUrl={plan.raceUrl || undefined}
      />
      {hasSummary && (
        <PlanSummary
          stravaSummaryText={stravaSummaryText}
          goal={plan.goal}
          targetTime={plan.targetTime}
          additionalInfo={plan.additionalInfo}
          coachSummary={coachSummary}
          adaptationNote={plan.adaptationNote}
          adaptationAt={plan.adaptationAt}
          adaptationSuggestedWeeks={plan.adaptationSuggestedWeeks}
          raceName={plan.raceName}
          distance={distance}
        />
      )}
      <PlanView html={planContentHtml} planId={id} />
      {weeksRenderedByReact && mergedWeeks && mergedWeeks.length > 0 && <PlanWeeksPortal weeks={mergedWeeks} />}
      {mergedWeeks && mergedWeeks.length > 0 && (
        <WeekGoalCelebration
          planId={id}
          mergedWeeks={mergedWeeks}
          celebratedWeekNumbers={plan.celebratedWeekNumbers}
        />
      )}
      <PlanTips tips={tips} distance={distance} />
      <SyncSection planId={id} hasWeeksData={!!weeksData} hasStrava={!!plan.stravaRefreshToken} lastSyncAt={plan.lastSyncAt} syncResult={plan.syncResult} />
      <RevisionForm planId={id} hasWeeksData={!!weeksData} />
    </>
  );
}
