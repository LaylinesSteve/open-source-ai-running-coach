import type { PlanWeek } from '@/lib/plan-generator';
import type { LoggedRun } from '@/lib/store';
import { plannedMiles } from '@/lib/merge-runs';
import { countsTowardRunningVolume } from '@/lib/strava';
import { addDaysCalendar, plannedDayDate, toLocalYmd } from '@/lib/training-week-calendar';

type PlanRun = PlanWeek['runs'][number];

/** A copy of the plan's weeks taken before something rewrote them, so a bad change can be undone. */
export interface WeeksSnapshot {
  at: string;
  reason: string;
  weeksData: PlanWeek[];
  coachSummary?: string;
}

const WEEKS_HISTORY_LIMIT = 5;

export function withWeeksSnapshot(history: WeeksSnapshot[] | undefined, snapshot: WeeksSnapshot): WeeksSnapshot[] {
  return [...(history ?? []), snapshot].slice(-WEEKS_HISTORY_LIMIT);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function formatMiles(n: number): string {
  return `${round1(n)} mi`;
}

/** Day labels are dated like "Sat 5/8"; true when a week has a day on the race date. */
function hasRaceDay(week: PlanWeek, raceDate: string): boolean {
  const [, m, d] = raceDate.split('-').map(Number);
  const md = new RegExp(`(^|\\D)${m}/${d}(\\D|$)`);
  return week.runs.some((r) => md.test(r.day));
}

/**
 * Decide how a revision reply applies to the current plan. A reply that ends on race week (or keeps the
 * plan's length) is the whole plan. Anything shorter is only the weeks the model changed: merge those into
 * the current plan by date range, then week number, instead of letting two weeks replace twenty-four.
 */
export function reconcileRevisedWeeks(
  current: PlanWeek[],
  revised: PlanWeek[],
  raceDate: string
): { weeks: PlanWeek[]; partial: boolean } {
  if (revised.length === 0) throw new Error('AI did not return any weeks');
  const last = revised[revised.length - 1];
  if (revised.length === current.length || last.raceWeek || hasRaceDay(last, raceDate)) {
    return { weeks: revised, partial: false };
  }

  const merged = current.map((w) => ({ ...w }));
  let replaced = 0;
  for (const r of revised) {
    let i = merged.findIndex((w) => r.range && w.range === r.range);
    if (i < 0) i = merged.findIndex((w) => w.num === r.num);
    if (i < 0 || merged[i].raceWeek) continue;
    merged[i] = { ...r, num: merged[i].num, raceWeek: false };
    replaced++;
  }
  if (replaced === 0) {
    throw new Error('The coach returned an incomplete plan, so nothing was changed. Try asking again.');
  }
  return { weeks: merged, partial: true };
}

/** Checks a weeks array sent from outside (restore endpoint) before it replaces the plan. */
export function parseWeeksPayload(raw: unknown, maxWeeks: number): PlanWeek[] {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > maxWeeks) {
    throw new Error(`weeksData must be an array of 1-${maxWeeks} weeks`);
  }
  return raw.map((w, i) => {
    const week = w as Record<string, unknown>;
    if (Number(week.num) !== i + 1) throw new Error(`Week ${i + 1} has num ${String(week.num)}; weeks must run 1..N`);
    if (!Array.isArray(week.runs)) throw new Error(`Week ${i + 1} has no runs array`);
    return {
      num: i + 1,
      range: String(week.range ?? ''),
      miles: String(week.miles ?? ''),
      phase: String(week.phase ?? ''),
      longRun: String(week.longRun ?? ''),
      raceWeek: i === raw.length - 1,
      runs: (week.runs as Record<string, unknown>[]).map((r) => ({
        day: String(r.day ?? ''),
        dist: String(r.dist ?? ''),
        notes: String(r.notes ?? ''),
        long: Boolean(r.long),
        coachTip: typeof r.coachTip === 'string' ? r.coachTip : '',
      })),
    };
  });
}

export interface RebalanceDay {
  index: number;
  run: PlanRun;
  date: string;
  /** done: the day is over, or already has an activity logged today. open: still to come. */
  status: 'done' | 'open';
  logged: LoggedRun[];
}

export interface WeekRebalanceState {
  goalMi: number;
  loggedMi: number;
  /** Running miles the open days must add up to so the week still hits its goal. */
  targetMi: number;
  plannedOpenMi: number;
  /** Longest single run the open days may hold: the week's own longest planned run. */
  capMi: number;
  days: RebalanceDay[];
  open: RebalanceDay[];
  /** Changes when anything that feeds the rebalance changes, so an unchanged week isn't re-asked. */
  signature: string;
}

/** Where the current week stands against its mileage goal, given what's been logged through today. */
export function weekRebalanceState(
  week: PlanWeek,
  weekMonday: Date,
  today: string,
  runLog: LoggedRun[]
): WeekRebalanceState | null {
  const goalMi = plannedMiles(week.miles);
  if (goalMi == null || goalMi <= 0 || week.raceWeek) return null;

  const monday = toLocalYmd(weekMonday);
  const sunday = toLocalYmd(addDaysCalendar(weekMonday, 6));
  if (today < monday || today > sunday) return null;

  const weekLog = runLog.filter((r) => r.date >= monday && r.date <= sunday && r.date <= today);
  const loggedMi = round1(
    weekLog.filter((r) => countsTowardRunningVolume(r.activityType)).reduce((s, r) => s + r.distanceMi, 0)
  );

  const days: RebalanceDay[] = week.runs.map((run, index) => {
    const d = plannedDayDate(run.day, weekMonday);
    const date = d ? toLocalYmd(d) : '';
    const logged = weekLog.filter((r) => r.date === date);
    const status = !date || date < today || (date === today && logged.length > 0) ? 'done' : 'open';
    return { index, run, date, status, logged };
  });
  const open = days.filter((d) => d.status === 'open');
  const plannedOpenMi = round1(open.reduce((s, d) => s + (plannedMiles(d.run.dist) ?? 0), 0));
  const capMi = Math.max(...week.runs.map((r) => plannedMiles(r.dist) ?? 0), 0);

  const signature = [
    week.num,
    today,
    loggedMi,
    weekLog.map((r) => `${r.stravaId}:${r.date}:${r.distanceMi}`).sort().join(','),
  ].join('|');

  return { goalMi, loggedMi, targetMi: round1(Math.max(0, goalMi - loggedMi)), plannedOpenMi, capMi, days, open, signature };
}

/** Whether the open days already add up to what the week still needs. */
export function weekAlreadyBalanced(state: WeekRebalanceState): boolean {
  return Math.abs(state.targetMi - state.plannedOpenMi) < 0.5;
}

/**
 * Applies the coach's new remaining days to the week, then enforces the numbers the model can get wrong:
 * no run over the cap, and running miles on the open days summing to the target (as far as the cap allows).
 * Done days are never touched.
 */
export function applyRebalancedDays(
  week: PlanWeek,
  state: WeekRebalanceState,
  proposed: PlanRun[]
): PlanWeek {
  if (proposed.length !== state.open.length) {
    throw new Error(`Coach returned ${proposed.length} days for ${state.open.length} remaining days`);
  }
  const cap = state.capMi;
  const miles = proposed.map((p) => Math.min(cap, Math.max(0, Math.round((plannedMiles(p.dist) ?? 0) * 2) / 2)));

  // Close the gap on days the coach made running days, biggest first, then put any 0.1-mile remainder on one of them.
  let order = miles.map((m, i) => i).filter((i) => miles[i] > 0);
  if (order.length === 0) order = state.open.map((d, i) => i).filter((i) => (plannedMiles(state.open[i].run.dist) ?? 0) > 0);
  order.sort((a, b) => miles[b] - miles[a]);
  let diff = round1(state.targetMi - miles.reduce((s, m) => s + m, 0));
  for (const i of order) {
    if (Math.abs(diff) < 0.05) break;
    const next = round1(Math.min(cap, Math.max(0, miles[i] + diff)));
    diff = round1(diff - (next - miles[i]));
    miles[i] = next;
  }

  const runs = week.runs.map((r) => ({ ...r }));
  state.open.forEach((day, i) => {
    const p = proposed[i];
    runs[day.index] = {
      day: day.run.day,
      dist: formatMiles(miles[i]),
      notes: p.notes?.trim() || day.run.notes,
      long: Boolean(p.long),
      coachTip: p.coachTip?.trim() || day.run.coachTip,
    };
  });
  return { ...week, runs };
}
