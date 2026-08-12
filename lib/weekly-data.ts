import {
  countsTowardRunningVolume,
  type StravaActivity,
  type StravaAthleteProfile,
} from '@/lib/strava';

export interface WeeklySessionDay {
  day: string;
  date: number;
  /** Distance in kilometers */
  dist: number;
  /** Moving time in seconds */
  time: number;
  /** Elevation in meters */
  elev: number;
  type: string;
}

export interface WeeklySessionWeek {
  range: string;
  sessions: WeeklySessionDay[];
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const M_TO_KM = 0.001;

function startOfMondayUTC(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  x.setUTCDate(x.getUTCDate() + diff);
  return x;
}

function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  const sameMonth = monday.getUTCMonth() === sunday.getUTCMonth();
  const sameYear = monday.getUTCFullYear() === sunday.getUTCFullYear();
  const monName = monday.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const sunName = sunday.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const year = sunday.getUTCFullYear();
  if (sameMonth) {
    return `${monName} ${monday.getUTCDate()} – ${sunday.getUTCDate()}, ${year}`;
  }
  if (sameYear) {
    return `${monName} ${monday.getUTCDate()} – ${sunName} ${sunday.getUTCDate()}, ${year}`;
  }
  return `${monName} ${monday.getUTCDate()}, ${monday.getUTCFullYear()} – ${sunName} ${sunday.getUTCDate()}, ${year}`;
}

function classifyRun(a: StravaActivity, distKm: number, weekMaxKm: number): string {
  const name = (a.name || '').toLowerCase();
  if (name.includes('interval')) return 'Intervals';
  if (name.includes('tempo') || name.includes('threshold')) return 'Tempo';
  if (name.includes('recovery') || name.includes('shakeout')) return 'Recovery';
  if (name.includes('long') || (weekMaxKm > 0 && distKm >= weekMaxKm * 0.85 && distKm >= 12)) return 'Long Run';
  if (name.includes('endurance') || distKm >= 10) return 'Endurance';
  return 'Easy';
}

/** Group running activities into Mon–Sun weeks (oldest → newest). */
export function buildWeeklyWeeksFromActivities(
  activities: StravaActivity[],
  maxWeeks = 12
): WeeklySessionWeek[] {
  const runs = activities.filter((a) => countsTowardRunningVolume(a.sport_type || a.type));

  if (runs.length === 0) return [];

  const byDay = new Map<string, { distM: number; time: number; elev: number; activities: StravaActivity[] }>();
  for (const a of runs) {
    const start = new Date(a.start_date);
    if (isNaN(start.getTime())) continue;
    const key = start.toISOString().slice(0, 10);
    const cur = byDay.get(key) ?? { distM: 0, time: 0, elev: 0, activities: [] };
    cur.distM += a.distance ?? 0;
    cur.time += a.moving_time ?? 0;
    cur.elev += a.total_elevation_gain ?? 0;
    cur.activities.push(a);
    byDay.set(key, cur);
  }

  const dates = [...byDay.keys()].sort();
  const earliest = new Date(dates[0] + 'T12:00:00Z');
  const latest = new Date(dates[dates.length - 1] + 'T12:00:00Z');
  let monday = startOfMondayUTC(earliest);
  const lastMonday = startOfMondayUTC(latest);

  const weeks: WeeklySessionWeek[] = [];
  while (monday.getTime() <= lastMonday.getTime()) {
    const sessions: WeeklySessionDay[] = [];
    const dayDistsKm: number[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      const agg = byDay.get(key);
      const distKm = agg ? agg.distM * M_TO_KM : 0;
      dayDistsKm.push(distKm);
      sessions.push({
        day: DAY_NAMES[i],
        date: d.getUTCDate(),
        dist: distKm,
        time: agg?.time ?? 0,
        elev: agg?.elev ?? 0,
        type: 'Rest',
      });
    }
    const weekMax = Math.max(...dayDistsKm, 0);
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      const agg = byDay.get(key);
      if (!agg || sessions[i].dist <= 0) continue;
      const primary = agg.activities[0];
      sessions[i].type = classifyRun(primary, sessions[i].dist, weekMax);
    }

    weeks.push({ range: formatWeekRange(monday), sessions });
    monday = new Date(monday);
    monday.setUTCDate(monday.getUTCDate() + 7);
  }

  if (weeks.length > maxWeeks) return weeks.slice(weeks.length - maxWeeks);
  return weeks;
}

export function athleteDisplayName(athlete?: StravaAthleteProfile): string {
  if (!athlete) return 'Athlete';
  const name = [athlete.firstname, athlete.lastname].filter(Boolean).join(' ').trim();
  if (name) return name;
  if (athlete.username) return athlete.username;
  return 'Athlete';
}

export function athleteInitials(athlete?: StravaAthleteProfile): string {
  const first = athlete?.firstname?.trim()?.[0];
  const last = athlete?.lastname?.trim()?.[0];
  if (first && last) return (first + last).toUpperCase();
  if (first) return first.toUpperCase();
  if (athlete?.username?.[0]) return athlete.username[0].toUpperCase();
  return 'RC';
}

/** Demo week data matching the Figma Make sample (Blaze visual). Oldest → newest. */
export const DEMO_WEEKS: WeeklySessionWeek[] = [
  {
    range: 'Jul 21 – 27, 2025',
    sessions: [
      { day: 'Mon', date: 21, dist: 6.5, time: 36 * 60 + 15, elev: 46, type: 'Easy' },
      { day: 'Tue', date: 22, dist: 8.0, time: 38 * 60 + 54, elev: 52, type: 'Tempo' },
      { day: 'Wed', date: 23, dist: 0, time: 0, elev: 0, type: 'Rest' },
      { day: 'Thu', date: 24, dist: 7.2, time: 39 * 60 + 36, elev: 48, type: 'Easy' },
      { day: 'Fri', date: 25, dist: 0, time: 0, elev: 0, type: 'Rest' },
      { day: 'Sat', date: 26, dist: 16.0, time: 87 * 60 + 12, elev: 155, type: 'Long Run' },
      { day: 'Sun', date: 27, dist: 5.0, time: 29 * 60, elev: 30, type: 'Recovery' },
    ],
  },
  {
    range: 'Jul 28 – Aug 3, 2025',
    sessions: [
      { day: 'Mon', date: 28, dist: 9.5, time: 51 * 60 + 45, elev: 70, type: 'Easy' },
      { day: 'Tue', date: 29, dist: 7.3, time: 35 * 60 + 48, elev: 46, type: 'Intervals' },
      { day: 'Wed', date: 30, dist: 0, time: 0, elev: 0, type: 'Rest' },
      { day: 'Thu', date: 31, dist: 14.2, time: 77 * 60 + 36, elev: 108, type: 'Endurance' },
      { day: 'Fri', date: 1, dist: 6.0, time: 33 * 60 + 18, elev: 38, type: 'Easy' },
      { day: 'Sat', date: 2, dist: 24.5, time: 131 * 60 + 30, elev: 238, type: 'Long Run' },
      { day: 'Sun', date: 3, dist: 7.1, time: 39 * 60 + 54, elev: 44, type: 'Recovery' },
    ],
  },
  {
    range: 'Aug 4 – 10, 2025',
    sessions: [
      { day: 'Mon', date: 4, dist: 8.2, time: 44 * 60 + 26, elev: 62, type: 'Easy' },
      { day: 'Tue', date: 5, dist: 0, time: 0, elev: 0, type: 'Rest' },
      { day: 'Wed', date: 6, dist: 12.4, time: 68 * 60 + 12, elev: 88, type: 'Endurance' },
      { day: 'Thu', date: 7, dist: 6.1, time: 30 * 60 + 30, elev: 40, type: 'Tempo' },
      { day: 'Fri', date: 8, dist: 0, time: 0, elev: 0, type: 'Rest' },
      { day: 'Sat', date: 9, dist: 21.1, time: 113 * 60, elev: 210, type: 'Long Run' },
      { day: 'Sun', date: 10, dist: 5.9, time: 33 * 60 + 24, elev: 35, type: 'Recovery' },
    ],
  },
];
