import type { PlanWeek } from '@/lib/plan-generator';
import type { LoggedRun } from '@/lib/store';
import { countsTowardRunningVolume } from '@/lib/strava';
import { getPlanWeek1Monday } from '@/lib/training-week-calendar';

export interface MergedActual {
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

/** Parse "Tue 3/17" to { month, day }. */
function parseRunDay(dayStr: string): { month: number; day: number } | null {
  const match = dayStr.match(/(\d{1,2})\/(\d{1,2})/);
  if (!match) return null;
  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
}

function loggedRunToMergedActual(r: LoggedRun): MergedActual {
  return {
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
    const weekStart = new Date(planStart);
    weekStart.setDate(weekStart.getDate() + (week.num - 1) * 7);
    const year = weekStart.getFullYear();

    const rowByDate = new Map<string, MergedRun>();

    // Planned runs -> rows (with date from day string)
    for (const run of week.runs) {
      const parsed = parseRunDay(run.day);
      if (!parsed) continue;
      const date = new Date(year, parsed.month - 1, parsed.day);
      if (isNaN(date.getTime())) continue;
      const dateStr = date.toISOString().slice(0, 10);
      rowByDate.set(dateStr, {
        dateStr,
        dayLabel: run.day,
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
