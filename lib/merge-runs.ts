import type { PlanWeek } from '@/lib/plan-generator';
import type { LoggedRun } from '@/lib/store';
import { countsTowardRunningVolume } from '@/lib/strava';
import {
  addDaysCalendar,
  formatPlanDayLabel,
  getPlanWeek1Monday,
  plannedDayDate,
  toLocalYmd,
} from '@/lib/training-week-calendar';

export interface MergedActual {
  /** Strava activity ID; absent for manually added runs. */
  stravaId?: number;
  name: string;
  activityType?: string;
  distanceMi: number;
  movingTimeSec?: number;
  elevationFt?: number;
  perceivedIntensity?: number;
  note?: string;
}

export interface MergedRun {
  dateStr: string;
  dayLabel: string;
  planned?: { dist: string; notes: string; long?: boolean; coachTip?: string };
  /** All logged activities on this date (Strava + manual). */
  actuals?: MergedActual[];
}

export interface MergedWeek extends Omit<PlanWeek, 'runs'> {
  runs: MergedRun[];
}

/** Sum running volume for a merged day row (all activities that count toward mileage). */
export function sumMergedRunRunningMi(run: MergedRun): number {
  if (!run.actuals?.length) return 0;
  return run.actuals
    .filter((a) => countsTowardRunningVolume(a.activityType))
    .reduce((sum, a) => sum + a.distanceMi, 0);
}

/** Planned miles from "4 mi", "5–6 mi" (lower bound), "10 miles"; null when the day isn't measured in miles. */
export function plannedMiles(dist: string): number | null {
  const m = dist.match(/(\d+(?:\.\d+)?)\s*(?:[-–]\s*\d+(?:\.\d+)?\s*)?(?:mi|miles?)\b/i);
  return m ? parseFloat(m[1]) : null;
}

/** Share of a run day's planned miles that must be logged for it to count as done. */
const RUN_DONE_SHARE = 0.9;

/**
 * Whether a planned workout is done: run days need at least 90% of their planned running miles;
 * gym / cross-training days (including "Rest + core work") count once any activity is logged.
 * Plain rest days and unplanned extras never do.
 */
export function isPlannedWorkoutDone(run: MergedRun): boolean {
  if (!run.planned || !run.actuals?.length) return false;
  const miles = plannedMiles(run.planned.dist);
  if (miles != null && miles > 0) return sumMergedRunRunningMi(run) >= miles * RUN_DONE_SHARE;
  const notes = run.planned.notes.trim();
  const isPlainRest = (/^rest\b/i.test(notes) && !notes.includes('+')) || /\brest\b/i.test(run.planned.dist);
  return !isPlainRest;
}

function loggedRunToMergedActual(r: LoggedRun): MergedActual {
  return {
    stravaId: r.stravaId > 0 ? r.stravaId : undefined,
    name: r.name,
    activityType: r.activityType,
    distanceMi: r.distanceMi,
    movingTimeSec: r.movingTimeSec,
    elevationFt: r.elevationFt,
    perceivedIntensity: r.perceivedIntensity,
    note: r.note,
  };
}

/** Merge plan weeks with run log: actual runs replace or sit alongside planned as we move through time. */
export function mergeWeeksWithRunLog(
  weeksData: PlanWeek[],
  runLog: LoggedRun[],
  raceDate: string,
  totalWeeks: number
): MergedWeek[] {
  const planStart = getPlanWeek1Monday(raceDate, totalWeeks);
  const runLogByWeek = new Map<number, LoggedRun[]>();
  for (const r of runLog) {
    if (r.weekNum < 1) continue;
    const list = runLogByWeek.get(r.weekNum) ?? [];
    list.push(r);
    runLogByWeek.set(r.weekNum, list);
  }

  const merged: MergedWeek[] = [];

  for (const week of weeksData) {
    const weekStart = addDaysCalendar(planStart, (week.num - 1) * 7);

    const rowByDate = new Map<string, MergedRun>();

    // Planned runs -> rows (date from the weekday within this plan week)
    for (const run of week.runs) {
      const date = plannedDayDate(run.day, weekStart);
      if (!date || isNaN(date.getTime())) continue;
      const dateStr = toLocalYmd(date);
      rowByDate.set(dateStr, {
        dateStr,
        dayLabel: formatPlanDayLabel(date),
        planned: { dist: run.dist, notes: run.notes ?? '', long: run.long, coachTip: run.coachTip },
      });
    }

    // Actual runs: group by date so multiple sessions on one day are all shown
    const actuals = runLogByWeek.get(week.num) ?? [];
    const actualsByDate = new Map<string, LoggedRun[]>();
    for (const r of actuals) {
      const list = actualsByDate.get(r.date) ?? [];
      list.push(r);
      actualsByDate.set(r.date, list);
    }

    for (const [date, runs] of actualsByDate) {
      const mergedActuals = runs
        .slice()
        .sort((a, b) => {
          const ta = a.movingTimeSec ?? 0;
          const tb = b.movingTimeSec ?? 0;
          return a.stravaId - b.stravaId || ta - tb;
        })
        .map(loggedRunToMergedActual);

      const existing = rowByDate.get(date);
      if (existing) {
        existing.actuals = mergedActuals;
      } else {
        rowByDate.set(date, {
          dateStr: date,
          dayLabel: runs[0].dayLabel,
          actuals: mergedActuals,
        });
      }
    }

    const runs = Array.from(rowByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, row]) => row);

    merged.push({
      ...week,
      runs,
    });
  }

  return merged;
}
