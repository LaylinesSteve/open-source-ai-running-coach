/** Shared progress chart logic for static HTML export and live React chart. */

import type { PlanWeek } from '@/lib/plan-generator';
import type { MergedWeek } from '@/lib/merge-runs';
import { sumMergedRunRunningMi } from '@/lib/merge-runs';
import { addDaysCalendar, getPlanWeek1Monday } from '@/lib/training-week-calendar';

export interface ProgressWeekInput {
  num: number;
  range: string;
  miles: string;
  phase: string;
  longRun: string;
  raceWeek?: boolean;
}

export interface ProgressBarDatum {
  weekNum: number;
  pct: number;
  barClass: string;
  datePart: string;
  /** Primary caption under the bar */
  label: string;
}

/** Parse weekly mileage strings: "~22 mi", "18–32 mi", "18 to 32 miles". Returns min/max of intended band. */
export function parseWeeklyMilesRange(miles: string): { min: number; max: number } | null {
  const s = miles.trim();
  if (!s || /^[—\-–]+$/i.test(s)) return null;

  const rangeTo = s.match(/(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)/i);
  if (rangeTo) {
    const a = parseFloat(rangeTo[1]);
    const b = parseFloat(rangeTo[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }

  const rangeDash = s.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (rangeDash) {
    const a = parseFloat(rangeDash[1]);
    const b = parseFloat(rangeDash[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }

  const single = s.match(/(\d+(?:\.\d+)?)/);
  if (!single) return null;
  const n = parseFloat(single[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return { min: n, max: n };
}

/** Minimum weekly miles to count as “goal hit” (range lower bound or single target). */
export function weeklyGoalMinMiles(miles: string): number {
  return parseWeeklyMilesRange(miles)?.min ?? 0;
}

function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** True once this plan week’s Sunday (Mon–Sun block) is strictly before today (local). */
export function isPlanWeekEnded(weekNum: number, raceDate: string, totalWeeks: number, now: Date = new Date()): boolean {
  const planStart = getPlanWeek1Monday(raceDate, totalWeeks);
  const weekMonday = addDaysCalendar(planStart, (weekNum - 1) * 7);
  const weekSunday = addDaysCalendar(weekMonday, 6);
  return toLocalYmd(weekSunday) < toLocalYmd(now);
}

function roundMi(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Planned weekly volume for bar height when no actuals: prefer week.miles band midpoint, else long run miles. */
export function plannedVolumeMilesForChart(w: Pick<ProgressWeekInput, 'miles' | 'longRun' | 'raceWeek'>): number | null {
  if (w.raceWeek) return null;
  const band = parseWeeklyMilesRange(w.miles);
  if (band && band.max > 0) return (band.min + band.max) / 2;
  return longRunMilesForChart(w.longRun);
}

/** Parse miles from long-run labels: "12 mi", "~15 MI", "15–18 mi", "18 miles". */
export function longRunMilesForChart(longRun: string): number | null {
  const s = longRun.trim();
  if (!s || /^(rest|—|--)$/i.test(s)) return null;

  const range = s.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(?:mi|miles?)\b/i);
  if (range) return Math.max(parseFloat(range[1]), parseFloat(range[2]));

  const single = s.match(/(\d+(?:\.\d+)?)\s*(?:mi|miles?)\b/i);
  if (single) return parseFloat(single[1]);

  const compact = s.match(/^(\d+(?:\.\d+)?)\s*mi$/i);
  if (compact) return parseFloat(compact[1]);

  return null;
}

function sumActualRunningMi(merged: MergedWeek): number {
  let s = 0;
  for (const r of merged.runs) {
    s += sumMergedRunRunningMi(r);
  }
  return s;
}

function barPct(value: number, scaleMax: number, raceWeek: boolean): number {
  if (raceWeek) return 100;
  if (scaleMax <= 0 || value <= 0) return 6;
  return Math.min(64, Math.max(8, Math.round((value / scaleMax) * 64)));
}

/**
 * Static / offline chart: bar height from planned weekly volume (week.miles band) with long-run fallback.
 */
export function progressBarData(weeks: ProgressWeekInput[]): ProgressBarDatum[] {
  const nonRace = weeks.filter((w) => !w.raceWeek);
  const vols = nonRace
    .map((w) => plannedVolumeMilesForChart(w))
    .filter((n): n is number => n != null && n > 0);
  const scaleMax = Math.max(...vols, 18);

  return weeks.map((w) => {
    const datePart = w.range.split(/[–-]/)[0]?.trim() ?? '';
    const isRace = w.raceWeek;
    const isTaper = w.phase.includes('Taper') && !w.raceWeek;
    const vol = plannedVolumeMilesForChart(w);
    const n = isRace ? null : vol ?? longRunMilesForChart(w.longRun);
    let pct: number;
    if (isRace) pct = 100;
    else if (n == null || n <= 0) pct = 100;
    else pct = barPct(n, scaleMax, false);

    let barClass = isRace ? 'race' : isTaper ? 'taper' : '';
    const label = isRace ? w.longRun : w.miles && w.miles.trim() && !/^[—\-–]+$/i.test(w.miles.trim()) ? w.miles : w.longRun;

    return {
      weekNum: w.num,
      pct,
      barClass,
      datePart,
      label,
    };
  });
}

/**
 * Live chart: ended weeks use logged running miles; future weeks use planned volume.
 * Green bar when an ended week meets weekly goal minimum (same idea as week celebration).
 */
export function progressBarDataWithActuals(
  weeks: PlanWeek[],
  mergedWeeks: MergedWeek[],
  raceDate: string,
  now: Date = new Date()
): ProgressBarDatum[] {
  const totalWeeks = weeks.length;

  const scratch = weeks.map((w) => {
    const merged = mergedWeeks.find((m) => m.num === w.num);
    const ended = isPlanWeekEnded(w.num, raceDate, totalWeeks, now);
    const plannedMid = plannedVolumeMilesForChart(w);
    const goalMin = weeklyGoalMinMiles(w.miles);
    const actualMi = merged ? sumActualRunningMi(merged) : 0;

    let valueForScale = 0;
    let barClass = '';
    let label = w.longRun;

    if (w.raceWeek) {
      valueForScale = ended ? Math.max(actualMi, 1) : Math.max(plannedMid ?? longRunMilesForChart(w.longRun) ?? 20, 18);
      barClass = 'race';
      label = ended && actualMi > 0 ? `${roundMi(actualMi)} mi` : w.longRun;
    } else if (ended) {
      valueForScale = actualMi;
      label = `${roundMi(actualMi)} mi`;
      const hit = goalMin > 0 && actualMi >= goalMin;
      if (hit) barClass = 'goal-met';
      else if (w.phase.includes('Taper')) barClass = 'taper';
    } else {
      valueForScale = plannedMid ?? longRunMilesForChart(w.longRun) ?? 8;
      const pm = plannedMid;
      label =
        pm != null
          ? `~${roundMi(pm)} mi`
          : w.miles.trim() && !/^[—\-–]+$/i.test(w.miles.trim())
            ? w.miles
            : w.longRun;
      if (w.phase.includes('Taper')) barClass = 'taper';
    }

    return { w, valueForScale, barClass, label, race: !!w.raceWeek };
  });

  const scaleMax = Math.max(...scratch.map((s) => s.valueForScale).filter((v) => v > 0), 18);

  return scratch.map((s) => {
    const pct = s.race ? 100 : barPct(s.valueForScale, scaleMax, false);
    return {
      weekNum: s.w.num,
      pct,
      barClass: s.barClass,
      datePart: s.w.range.split(/[–-]/)[0]?.trim() ?? '',
      label: s.label,
    };
  });
}
