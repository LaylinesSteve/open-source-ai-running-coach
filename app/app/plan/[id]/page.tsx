import { redirect } from 'next/navigation';
import { getPlan } from '@/lib/store';

/** Per-plan data must not be statically cached (multiple plans, fresh Strava log). */
export const dynamic = 'force-dynamic';
import { clampPlanWeeks, getDefaultWeeksForDistance } from '@/lib/race-distances';
import { generatePlanWeeks, planWeeksToHtml } from '@/lib/plan-generator';
import { getPlanWeek1Monday } from '@/lib/training-week-calendar';
import {
  getAccessTokenForPlan,
  buildPrePlanBaselineSummary,
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
import LongRunProgress from './LongRunProgress';
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

/** Drop embedded progress chart so we render it from live weeksData (matches week cards after revise/sync). */
function stripProgressSectionFromPlanHtml(html: string): string {
  return html.replace(/<section\b[^>]*\bid=["']progress["'][^>]*>[\s\S]*?<\/section>\s*/i, '');
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
    let weeks = generatePlanWeeks(new Date(plan.raceDate + 'T12:00:00'), distance, plan.weeks);

    if (plan.stravaRefreshToken && process.env.GEMINI_API_KEY) {
      try {
        const accessToken = await getAccessTokenForPlan(plan);
        if (accessToken) {
          const activities = await fetchStravaActivities(accessToken);
          const numWeeksForBaseline =
            plan.weeks != null && Number.isFinite(plan.weeks)
              ? clampPlanWeeks(Math.round(plan.weeks))
              : getDefaultWeeksForDistance(distance);
          const planWeek1Monday = getPlanWeek1Monday(plan.raceDate, numWeeksForBaseline);
          const baselineBlock = buildPrePlanBaselineSummary(activities, planWeek1Monday);
          const stravaSummary = [buildStravaSummary(activities), baselineBlock].filter(Boolean).join('\n\n');
          stravaSummaryText = stravaSummary;
          const result = await generatePlanWithAI(plan, stravaSummary);
          weeks = result.weeks;
          coachSummary = result.coachSummary || undefined;
          tips = result.tips?.length ? result.tips : undefined;
        }
      } catch {
        weeks = generatePlanWeeks(new Date(plan.raceDate + 'T12:00:00'), distance, plan.weeks);
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
      weeks: weeksData.length,
      weeksData,
      tips: tips || undefined,
      coachSummaryHistory,
    });
  }

  /** Legacy plans: HTML exists but weeksData never saved — merge/sync/log need structured weeks. */
  if ((!weeksData || weeksData.length === 0) && html) {
    weeksData = generatePlanWeeks(new Date(plan.raceDate + 'T12:00:00'), distance, plan.weeks);
    const { updatePlan } = await import('@/lib/store');
    await updatePlan(id, { weeksData, weeks: weeksData.length });
  }

  const hasSummary =
    stravaSummaryText ||
    plan.goal ||
    plan.targetTime ||
    plan.additionalInfo ||
    coachSummary ||
    plan.adaptationNote ||
    (plan.runLog?.length ?? 0) > 0;
  const baseHtml = stripHeroFromPlanHtml(html);
  const hasLiveWeeksUi = !!(weeksData && weeksData.length > 0);
  const planContentHtml = hasLiveWeeksUi
    ? stripProgressSectionFromPlanHtml(stripWeeksGridContent(baseHtml))
    : baseHtml;
  const weeksRenderedByReact = hasLiveWeeksUi;
  const numWeeks = weeksData?.length ?? plan.weeks ?? 12;
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
          runLog={plan.runLog}
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
      {hasLiveWeeksUi && weeksData && mergedWeeks && (
        <LongRunProgress weeks={weeksData} mergedWeeks={mergedWeeks} raceDate={plan.raceDate} />
      )}
      <PlanView html={planContentHtml} planId={id} hasStrava={!!plan.stravaRefreshToken} />
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
