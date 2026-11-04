/**
 * Reads running form from a Garmin activity download (a ZIP holding a FIT file).
 * Only the metrics named here are read, so GPS and device details in the file are never kept.
 */
import { Buffer } from 'node:buffer';
import { unzipSync } from 'fflate';
import FitParser from 'fit-file-parser';
import type { Averages, FormMetric, RunForm } from '@/lib/form-trends';

const METRES_PER_MILE = 1609.344;
/** Below this it's a walk or a hike, and walking form would skew running form. */
const MIN_RUNNING_CADENCE_SPM = 140;
/** A longer gap means the watch was paused, so it isn't running time. */
const MAX_SAMPLE_SECONDS = 10;
const MIN_BAND_MINUTES = 1;
const MIN_FADE_MINUTES = 30;

type FitRecord = {
  timestamp?: Date | string;
  distance?: number;
  heart_rate?: number;
  cadence?: number;
  fractional_cadence?: number;
  enhanced_speed?: number;
  speed?: number;
  power?: number;
  stance_time?: number;
  stance_time_balance?: number;
  step_length?: number;
  vertical_oscillation?: number;
  vertical_ratio?: number;
};

type Sample = { seconds: number; speed: number; values: Averages };

/** Zero means not measured, so it's skipped. */
const READERS: [FormMetric, (record: FitRecord) => number | undefined][] = [
  ['hr', (r) => r.heart_rate],
  ['gct', (r) => r.stance_time],
  ['gctBalance', (r) => r.stance_time_balance],
  ['stride', (r) => r.step_length && r.step_length / 1000],
  ['vertOsc', (r) => r.vertical_oscillation && r.vertical_oscillation / 10],
  ['vertRatio', (r) => r.vertical_ratio],
  ['power', (r) => r.power],
];

function cadenceSpm(record: FitRecord): number {
  return ((record.cadence ?? 0) + (record.fractional_cadence ?? 0)) * 2;
}

function toSamples(records: FitRecord[]): Sample[] {
  const samples: Sample[] = [];
  let lastTime: number | undefined;
  for (const record of records) {
    const time = new Date(record.timestamp ?? NaN).getTime();
    if (!Number.isFinite(time)) continue;
    const seconds = lastTime === undefined ? 0 : (time - lastTime) / 1000;
    lastTime = time;
    const cadence = cadenceSpm(record);
    if (seconds <= 0 || seconds > MAX_SAMPLE_SECONDS || cadence < MIN_RUNNING_CADENCE_SPM) continue;

    const values: Averages = { cadence };
    for (const [metric, read] of READERS) {
      const value = read(record);
      if (value) values[metric] = value;
    }
    samples.push({ seconds, speed: record.enhanced_speed ?? record.speed ?? 0, values });
  }
  return samples;
}

/** Time-weighted averages. Each metric keeps its own weight, because sensors can drop out partway. */
function average(samples: Sample[]): Averages {
  const sums = new Map<FormMetric, { total: number; seconds: number }>();
  for (const { seconds, values } of samples) {
    for (const [metric, value] of Object.entries(values) as [FormMetric, number][]) {
      const sum = sums.get(metric) ?? { total: 0, seconds: 0 };
      sums.set(metric, { total: sum.total + value * seconds, seconds: sum.seconds + seconds });
    }
  }
  return Object.fromEntries(
    [...sums].map(([metric, { total, seconds }]) => [metric, Number((total / seconds).toFixed(2))])
  );
}

function minutesIn(samples: Sample[]): number {
  return samples.reduce((total, sample) => total + sample.seconds, 0) / 60;
}

function byPace(samples: Sample[]): RunForm['bands'] {
  const groups = new Map<number, Sample[]>();
  for (const sample of samples) {
    if (sample.speed <= 0) continue;
    const band = Math.floor(METRES_PER_MILE / sample.speed / 60);
    groups.set(band, [...(groups.get(band) ?? []), sample]);
  }
  const bands: RunForm['bands'] = {};
  for (const [band, group] of groups) {
    const minutes = minutesIn(group);
    if (minutes >= MIN_BAND_MINUTES) {
      bands[String(band)] = { minutes: Number(minutes.toFixed(1)), metrics: average(group) };
    }
  }
  return bands;
}

function fade(samples: Sample[]): RunForm['fade'] {
  const minutes = minutesIn(samples);
  if (minutes < MIN_FADE_MINUTES) return undefined;
  const quarter = (minutes * 60) / 4;
  const first: Sample[] = [];
  const last: Sample[] = [];
  let elapsed = 0;
  for (const sample of samples) {
    if (elapsed < quarter) first.push(sample);
    if (elapsed >= quarter * 3) last.push(sample);
    elapsed += sample.seconds;
  }
  return { first: average(first), last: average(last) };
}

/** Form numbers for one run. A run with no usable data comes back empty, so it isn't downloaded again. */
export async function analyzeRun(
  run: Pick<RunForm, 'id' | 'date' | 'type'>,
  zip: Uint8Array
): Promise<RunForm> {
  const fit = Object.entries(unzipSync(zip)).find(([name]) => /\.fit$/i.test(name))?.[1];
  if (!fit) throw new Error('Garmin activity download has no FIT file');

  const parsed = await new FitParser({ mode: 'list', speedUnit: 'm/s', lengthUnit: 'm' }).parseAsync(
    Buffer.from(fit)
  );
  const records = (parsed.records ?? []) as unknown as FitRecord[];
  const samples = toSamples(records);
  const distance = Math.max(0, ...records.map((record) => record.distance ?? 0));

  return {
    ...run,
    miles: Number((distance / METRES_PER_MILE).toFixed(2)),
    runningMinutes: Number(minutesIn(samples).toFixed(1)),
    overall: average(samples),
    bands: byPace(samples),
    fade: fade(samples),
  };
}
