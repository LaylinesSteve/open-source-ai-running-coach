import type { PlanWeek } from '@/lib/plan-generator';
import type { LoggedRun } from '@/lib/store';

export interface MergedRun {
  dateStr: string;
  dayLabel: string;
  planned?: { dist: string; notes: string; long?: boolean; coachTip?: string };
  actual?: { name: string; distanceMi: number; movingTimeSec?: number; elevationFt?: number; note?: string };
}

export interface MergedWeek extends Omit<PlanWeek, 'runs'> {
  runs: MergedRun[];
}

/** Get plan start (Monday of week 1). */
function getPlanStartDate(raceDate: string, weeks: number): Date {
  const d = new Date(raceDate + 'T12:00:00');
  d.setDate(d.getDate() - (weeks - 1) * 7 - 6);
  return d;
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

/** Format date as "Tue 3/17". */
function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}

/** Merge plan weeks with run log: actual runs replace or sit alongside planned as we move through time. */
export function mergeWeeksWithRunLog(
  weeksData: PlanWeek[],
  runLog: LoggedRun[],
  raceDate: string,
  totalWeeks: number
): MergedWeek[] {
  const planStart = getPlanStartDate(raceDate, totalWeeks);
  const runLogByWeek = new Map<number, LoggedRun[]>();
  for (const r of runLog) {
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

    // Actual runs: fill in or add row
    const actuals = runLogByWeek.get(week.num) ?? [];
    for (const r of actuals) {
      const existing = rowByDate.get(r.date);
      if (existing) {
        existing.actual = {
          name: r.name,
          distanceMi: r.distanceMi,
          movingTimeSec: r.movingTimeSec,
          elevationFt: r.elevationFt,
          note: r.note,
        };
      } else {
        rowByDate.set(r.date, {
          dateStr: r.date,
          dayLabel: r.dayLabel,
          actual: {
            name: r.name,
            distanceMi: r.distanceMi,
            movingTimeSec: r.movingTimeSec,
            elevationFt: r.elevationFt,
            note: r.note,
          },
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
