/**
 * Training plans use Monday–Sunday calendar weeks. Plan week 1 starts on the Monday
 * of the week that contains week 1’s key workout day (aligned with {@link generatePlanWeeks}).
 */

export function addDaysCalendar(d: Date, days: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
  out.setDate(out.getDate() + days);
  return out;
}

/** Monday (local) of the Monday–Sunday week containing `d`. */
export function startOfMondayWeekContaining(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
  const dow = x.getDay();
  const daysBack = (dow + 6) % 7;
  x.setDate(x.getDate() - daysBack);
  return x;
}

/** Sunday (local) ending the week that starts on `weekMonday`. */
export function endOfSundayWeek(weekMonday: Date): Date {
  return addDaysCalendar(weekMonday, 6);
}

/**
 * Monday of plan week 1 — same anchor used when merging runs, sync, and manual logs.
 */
export function getPlanWeek1Monday(raceDateStr: string, totalWeeks: number): Date {
  const race = new Date(raceDateStr + 'T12:00:00');
  if (isNaN(race.getTime())) return race;
  const week1LongRunDay = addDaysCalendar(race, -7 * (totalWeeks - 1));
  return startOfMondayWeekContaining(week1LongRunDay);
}

const WEEKDAYS_FROM_MONDAY = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Local YYYY-MM-DD (toISOString would shift the day in timezones east of UTC). */
export function toLocalYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "Tue 3/17" */
export function formatPlanDayLabel(d: Date): string {
  return `${WEEKDAY_NAMES[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * Calendar date of a planned day inside the plan week starting `weekMonday`.
 * Uses the weekday name ("Tue", "Tue 3/17", "Tuesday") so labels without a date still resolve, then falls
 * back to month/day, picking the year that keeps the date nearest the week (weeks can span New Year).
 */
export function plannedDayDate(dayStr: string, weekMonday: Date): Date | null {
  const weekdayIndex = WEEKDAYS_FROM_MONDAY.indexOf(dayStr.trim().slice(0, 3).toLowerCase());
  if (weekdayIndex >= 0) return addDaysCalendar(weekMonday, weekdayIndex);

  const match = dayStr.match(/(\d{1,2})\/(\d{1,2})/);
  if (!match) return null;
  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const year = weekMonday.getFullYear();
  const candidates = [year - 1, year, year + 1].map((y) => new Date(y, month - 1, day, 12, 0, 0, 0));
  return candidates.reduce((best, c) =>
    Math.abs(c.getTime() - weekMonday.getTime()) < Math.abs(best.getTime() - weekMonday.getTime()) ? c : best
  );
}

/** Rewrite each planned day's label as "Tue 3/17" from its position in the plan, so every reader can date it. */
export function withDatedDayLabels<W extends { num: number; runs: { day: string }[] }>(
  weeks: W[],
  raceDateStr: string
): W[] {
  const planStart = getPlanWeek1Monday(raceDateStr, weeks.length);
  if (isNaN(planStart.getTime())) return weeks;
  return weeks.map((week) => {
    const weekMonday = addDaysCalendar(planStart, (week.num - 1) * 7);
    return {
      ...week,
      runs: week.runs.map((run) => {
        const date = plannedDayDate(run.day, weekMonday);
        return date ? { ...run, day: formatPlanDayLabel(date) } : run;
      }),
    };
  });
}

/**
 * 1-based index of the Monday–Sunday plan week containing `dateStr` (YYYY-MM-DD), relative to plan week 1.
 * Returns 0 if the activity is strictly before the Monday that starts plan week 1 (should not attach to week 1).
 */
export function weekNumberFromPlanStart(dateStr: string, planWeek1Monday: Date): number {
  const activity = new Date(dateStr + 'T12:00:00');
  const start = new Date(
    planWeek1Monday.getFullYear(),
    planWeek1Monday.getMonth(),
    planWeek1Monday.getDate(),
    12,
    0,
    0,
    0
  );
  if (activity.getTime() < start.getTime()) return 0;
  const diffMs = activity.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  return Math.min(999, Math.floor(diffDays / 7) + 1);
}
