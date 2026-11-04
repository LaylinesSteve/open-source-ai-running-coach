/** Running form data shared by the sync route, the page and the AI review. Safe to import in the browser. */

export type FormMetric =
  | 'cadence'
  | 'gct'
  | 'gctBalance'
  | 'stride'
  | 'vertOsc'
  | 'vertRatio'
  | 'power'
  | 'hr';

export type Averages = Partial<Record<FormMetric, number>>;

export type RunForm = {
  id: number;
  date: string;
  type: string;
  miles: number;
  /** Time actually running: walking and stops are left out, so a hiked climb doesn't skew form numbers. */
  runningMinutes: number;
  overall: Averages;
  /** Keyed by whole minutes per mile: "9" is 9:00 to 9:59 pace. */
  bands: Record<string, { minutes: number; metrics: Averages }>;
  /** First and last quarter of the running time, for runs long enough to fade. */
  fade?: { first: Averages; last: Averages };
};

export type FormReview = { text: string; at: string };

export type FormChatMessage = { role: 'user' | 'assistant'; content: string; at: string };

export type FormStore = {
  runs: RunForm[];
  pending: { id: number; date: string; type: string }[];
  review?: FormReview;
  updatedAt?: string;
};

export const FORM_WINDOW_DAYS = 182;

export const FORM_METRICS: { key: FormMetric; label: string; unit: string; decimals: number }[] = [
  { key: 'cadence', label: 'Cadence', unit: 'spm', decimals: 0 },
  { key: 'gct', label: 'Ground contact time', unit: 'ms', decimals: 0 },
  { key: 'stride', label: 'Stride length', unit: 'm', decimals: 2 },
  { key: 'vertOsc', label: 'Vertical oscillation', unit: 'cm', decimals: 1 },
  { key: 'vertRatio', label: 'Vertical ratio', unit: '%', decimals: 1 },
  { key: 'gctBalance', label: 'Ground contact balance, left foot', unit: '%', decimals: 1 },
  { key: 'power', label: 'Running power', unit: 'W', decimals: 0 },
  { key: 'hr', label: 'Heart rate', unit: 'bpm', decimals: 0 },
];

export type TrendPoint = { key: string; minutes: number; runs: number; metrics: Averages };

/** One run's numbers, either overall or only the part at one pace. */
function partOf(run: RunForm, band: number | null): { minutes: number; metrics: Averages } | null {
  if (band !== null) return run.bands[String(band)] ?? null;
  return run.runningMinutes > 0 ? { minutes: run.runningMinutes, metrics: run.overall } : null;
}

/** Averages weighted by running time. Each metric keeps its own weight, because not every run has every metric. */
function groupRuns(
  runs: RunForm[],
  band: number | null,
  keyOf: (run: RunForm) => string
): Map<string, TrendPoint> {
  const groups = new Map<
    string,
    { minutes: number; runs: number; sums: Map<FormMetric, { total: number; minutes: number }> }
  >();
  for (const run of runs) {
    const part = partOf(run, band);
    if (!part) continue;
    const key = keyOf(run);
    const group = groups.get(key) ?? { minutes: 0, runs: 0, sums: new Map() };
    groups.set(key, group);
    group.minutes += part.minutes;
    group.runs += 1;
    for (const { key: metric } of FORM_METRICS) {
      const value = part.metrics[metric];
      if (value === undefined) continue;
      const sum = group.sums.get(metric) ?? { total: 0, minutes: 0 };
      group.sums.set(metric, {
        total: sum.total + value * part.minutes,
        minutes: sum.minutes + part.minutes,
      });
    }
  }
  return new Map(
    [...groups].map(([key, { minutes, runs: count, sums }]) => [
      key,
      {
        key,
        minutes,
        runs: count,
        metrics: Object.fromEntries(
          [...sums].map(([metric, sum]) => [metric, sum.total / sum.minutes])
        ),
      },
    ])
  );
}

/** The Monday of a date's week, as YYYY-MM-DD. */
export function weekOf(date: string): string {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

/** Every week from the one holding `from` to the one holding `to`, so gaps in training stay visible. */
export function weeksBetween(from: string, to: string): string[] {
  const weeks: string[] = [];
  const last = weekOf(to);
  for (let week = weekOf(from); week <= last; ) {
    weeks.push(week);
    const next = new Date(`${week}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 7);
    week = next.toISOString().slice(0, 10);
  }
  return weeks;
}

export function weeklyTrend(runs: RunForm[], band: number | null): Map<string, TrendPoint> {
  return groupRuns(runs, band, (run) => weekOf(run.date));
}

function monthlyTrend(runs: RunForm[], band: number | null): TrendPoint[] {
  const points = groupRuns(runs, band, (run) => run.date.slice(0, 7));
  return [...points.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/** The latest few weeks against the earliest few, so one odd week doesn't set the headline. */
export function recentChange(
  points: TrendPoint[],
  metric: FormMetric
): { recent: number; change?: number; since?: string } | null {
  const withValue = points.filter((point) => point.metrics[metric] !== undefined);
  if (withValue.length === 0) return null;
  const mean = (group: TrendPoint[]) =>
    group.reduce((total, p) => total + (p.metrics[metric] ?? 0) * p.minutes, 0) /
    group.reduce((total, p) => total + p.minutes, 0);
  const size = Math.min(4, Math.floor(withValue.length / 2));
  if (size === 0) return { recent: mean(withValue) };
  const recent = mean(withValue.slice(-size));
  return { recent, change: recent - mean(withValue.slice(0, size)), since: withValue[0].key };
}

/** Pace bands with the most running time, most first. */
export function paceBands(runs: RunForm[]): { band: number; minutes: number }[] {
  const minutes = new Map<number, number>();
  for (const run of runs) {
    for (const [band, part] of Object.entries(run.bands)) {
      minutes.set(Number(band), (minutes.get(Number(band)) ?? 0) + part.minutes);
    }
  }
  return [...minutes]
    .map(([band, total]) => ({ band, minutes: total }))
    .sort((a, b) => b.minutes - a.minutes);
}

export function paceLabel(band: number): string {
  return `${band}:00–${band}:59`;
}

export function fadeChange(run: RunForm, metric: FormMetric): number | undefined {
  const first = run.fade?.first[metric];
  const last = run.fade?.last[metric];
  return first === undefined || last === undefined ? undefined : last - first;
}

function format(value: number | undefined, decimals: number): string {
  return value === undefined ? '' : value.toFixed(decimals);
}

function trendTable(points: TrendPoint[]): string {
  const columns = FORM_METRICS.filter(({ key }) => points.some((p) => p.metrics[key] !== undefined));
  const header = ['month', 'running_minutes', ...columns.map((c) => `${c.key}_${c.unit}`)].join(',');
  const rows = points.map((point) =>
    [
      point.key,
      Math.round(point.minutes),
      ...columns.map((c) => format(point.metrics[c.key], c.decimals)),
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

/** The numbers behind the page, as text for the AI review. */
export function formSummary(runs: RunForm[]): string {
  const withForm = runs
    .filter((run) => run.runningMinutes > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
  const sections = [
    `Runs analyzed: ${withForm.length}, from ${withForm.at(-1)?.date} to ${withForm[0]?.date}.`,
    `All running, by month:\n${trendTable(monthlyTrend(withForm, null))}`,
    ...paceBands(withForm)
      .slice(0, 3)
      .map(
        ({ band }) =>
          `Only at ${paceLabel(band)} per mile, by month:\n${trendTable(monthlyTrend(withForm, band))}`
      ),
  ];

  const faded = withForm
    .filter((run) => run.fade)
    .sort((a, b) => b.runningMinutes - a.runningMinutes)
    .slice(0, 12)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (faded.length > 0) {
    const columns = FORM_METRICS.filter(({ key }) => faded.some((r) => fadeChange(r, key) !== undefined));
    sections.push(
      [
        'Longest runs: last quarter of running time minus first quarter.',
        ['date', 'miles', 'running_minutes', ...columns.map((c) => `${c.key}_${c.unit}`)].join(','),
        ...faded.map((run) =>
          [
            run.date,
            run.miles.toFixed(1),
            Math.round(run.runningMinutes),
            ...columns.map((c) => format(fadeChange(run, c.key), c.decimals)),
          ].join(',')
        ),
      ].join('\n')
    );
  }
  return sections.join('\n\n');
}

/** Every run on its own line, so chat can answer about a specific date. */
function runsTable(runs: RunForm[]): string {
  const columns = FORM_METRICS.filter(({ key }) => runs.some((r) => r.overall[key] !== undefined));
  const header = ['date', 'type', 'miles', 'running_minutes', ...columns.map((c) => `${c.key}_${c.unit}`)];
  const rows = runs.map((run) =>
    [
      run.date,
      run.type,
      run.miles.toFixed(1),
      Math.round(run.runningMinutes),
      ...columns.map((c) => format(run.overall[c.key], c.decimals)),
    ].join(',')
  );
  return [header.join(','), ...rows].join('\n');
}

export function formChatContext(runs: RunForm[]): string {
  const withForm = runs
    .filter((run) => run.runningMinutes > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
  return `${formSummary(withForm)}\n\nEvery run, newest first:\n${runsTable(withForm)}`;
}
