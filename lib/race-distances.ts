/** Allowed plan length when the athlete overrides the default for their distance. */
export const MIN_PLAN_WEEKS = 4;
export const MAX_PLAN_WEEKS = 52;

export function clampPlanWeeks(n: number): number {
  if (!Number.isFinite(n)) return MIN_PLAN_WEEKS;
  return Math.min(MAX_PLAN_WEEKS, Math.max(MIN_PLAN_WEEKS, Math.round(n)));
}

/** Local calendar Monday 00:00 for the week containing `year`/`monthIndex`/`day`. */
function startOfWeekMondayLocal(year: number, monthIndex: number, day: number): Date {
  const d = new Date(year, monthIndex, day);
  const dow = d.getDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + delta);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Weeks from the current calendar week through the week that contains race day (Monday-aligned),
 * inclusive — i.e. “start training this week” through race week. Matches plans whose final week ends on race day.
 * Returns null if the date is invalid or race week is entirely before this week.
 */
export function weeksFromNowToRaceWeek(raceDateStr: string): number | null {
  const trimmed = raceDateStr.trim();
  const parts = trimmed.split('-').map((s) => parseInt(s, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, m, day] = parts;
  const raceDay = new Date(y, m - 1, day);
  if (isNaN(raceDay.getTime())) return null;

  const raceWeekMon = startOfWeekMondayLocal(y, m - 1, day);
  const now = new Date();
  const thisWeekMon = startOfWeekMondayLocal(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = raceWeekMon.getTime() - thisWeekMon.getTime();
  const msWeek = 7 * 24 * 60 * 60 * 1000;
  const diffWeeks = Math.round(diffMs / msWeek);
  const inclusiveWeeks = diffWeeks + 1;
  if (inclusiveWeeks < 1) return null;
  return clampPlanWeeks(inclusiveWeeks);
}

/** Common race distances and default plan length in weeks. */
export const RACE_DISTANCE_OPTIONS: { value: string; label: string; weeks: number }[] = [
  { value: '5K', label: '5K', weeks: 6 },
  { value: '10K', label: '10K', weeks: 8 },
  { value: 'Half Marathon', label: 'Half Marathon', weeks: 10 },
  { value: 'Marathon', label: 'Marathon', weeks: 12 },
  { value: '50K', label: '50K', weeks: 11 },
  { value: '50 Mile', label: '50 Mile', weeks: 14 },
  { value: '100K', label: '100K', weeks: 16 },
  { value: '100 Mile', label: '100 Mile', weeks: 20 },
];

const WEEKS_BY_DISTANCE: Record<string, number> = Object.fromEntries(
  RACE_DISTANCE_OPTIONS.map((d) => [d.value, d.weeks])
);

export function getDefaultWeeksForDistance(distance: string): number {
  return WEEKS_BY_DISTANCE[distance] ?? 12;
}
