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
