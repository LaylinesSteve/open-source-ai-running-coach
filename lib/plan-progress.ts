/** Shared long-run bar chart logic for static HTML export and live React chart (must stay in sync with weeksData). */

export interface ProgressWeekInput {
  num: number;
  range: string;
  phase: string;
  longRun: string;
  raceWeek?: boolean;
}

export interface ProgressBarDatum {
  weekNum: number;
  longRun: string;
  pct: number;
  barClass: string;
  datePart: string;
}

/** Parse miles from AI/static labels: "12 mi", "~15 MI", "15-18 mi", "18 miles". */
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

export function progressBarData(weeks: ProgressWeekInput[]): ProgressBarDatum[] {
  const nonRace = weeks.filter((w) => !w.raceWeek);
  const miles = nonRace
    .map((w) => longRunMilesForChart(w.longRun))
    .filter((n): n is number => n != null && n > 0);
  const maxLongRunMi = Math.max(...miles, 18);

  return weeks.map((w) => {
    const datePart = w.range.split(/[–-]/)[0]?.trim() ?? '';
    const isRace = w.raceWeek;
    const isTaper = w.phase.includes('Taper') && !w.raceWeek;
    let pct: number;
    if (isRace) {
      pct = 100;
    } else {
      const n = longRunMilesForChart(w.longRun);
      if (n == null || n <= 0) {
        pct = 100;
      } else {
        pct = Math.min(64, Math.round((n / maxLongRunMi) * 64)) || 21;
      }
    }
    const barClass = isRace ? 'race' : isTaper ? 'taper' : '';
    return {
      weekNum: w.num,
      longRun: w.longRun,
      pct,
      barClass,
      datePart,
    };
  });
}
