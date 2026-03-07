import type { PlanRecord } from '@/lib/store';
import type { PlanWeek } from '@/lib/plan-generator';
import { refreshStravaToken, fetchStravaActivities, type StravaActivity } from '@/lib/strava';
import { getPlan, updatePlan } from '@/lib/store';

const FIVE_MINUTES = 5 * 60;

/** Get valid Strava access token for this plan, refreshing if needed. */
export async function getAccessTokenForPlan(plan: PlanRecord): Promise<string | null> {
  if (!plan.stravaRefreshToken) return null;
  let accessToken = plan.stravaAccessToken ?? null;
  const expiresAt = plan.stravaExpiresAt ?? 0;
  const now = Math.floor(Date.now() / 1000);
  if (expiresAt && expiresAt - now < FIVE_MINUTES) {
    const tokens = await refreshStravaToken(plan.stravaRefreshToken);
    await updatePlan(plan.id, {
      stravaAccessToken: tokens.access_token,
      stravaRefreshToken: tokens.refresh_token,
      stravaExpiresAt: tokens.expires_at,
    });
    accessToken = tokens.access_token;
  }
  return accessToken ?? plan.stravaAccessToken ?? null;
}

/** Build a text summary of the athlete's running from Strava activities for the AI. */
export function buildStravaSummary(activities: StravaActivity[]): string {
  const runs = activities.filter((a) => a.type === 'Run');
  if (runs.length === 0) return 'No running activities in Strava.';

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const recent = runs.filter((r) => new Date(r.start_date) >= ninetyDaysAgo);
  if (recent.length === 0) return 'No runs in the last 90 days.';

  const byWeek = new Map<string, { count: number; miles: number; longest: number }>();
  for (const r of recent) {
    const d = new Date(r.start_date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    const mi = (r.distance ?? 0) / 1609.34;
    const cur = byWeek.get(key) ?? { count: 0, miles: 0, longest: 0 };
    cur.count += 1;
    cur.miles += mi;
    cur.longest = Math.max(cur.longest, mi);
    byWeek.set(key, cur);
  }

  const sortedWeeks = [...byWeek.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const lines: string[] = [
    `Total runs (last 90 days): ${recent.length}.`,
    `Weekly summary (week starting Monday):`,
  ];
  for (const [weekStart, { count, miles, longest }] of sortedWeeks.slice(-12)) {
    lines.push(`  ${weekStart}: ${count} runs, ${miles.toFixed(1)} mi, longest run ${longest.toFixed(1)} mi`);
  }
  const totalMi = recent.reduce((s, r) => s + (r.distance ?? 0) / 1609.34, 0);
  const avgPerRun = totalMi / recent.length;
  lines.push(`Overall: ~${totalMi.toFixed(0)} mi total, ~${avgPerRun.toFixed(1)} mi/run average.`);
  return lines.join('\n');
}

const PLAN_WEEK_JSON_SCHEMA = `Each week must be a JSON object with:
- num: number (1-11)
- range: string, e.g. "Mar 7–13" (Monday–Sunday of that week)
- miles: string, e.g. "~16 mi" or "—" for race week
- phase: string, one of "Base", "Build", "Peak", "Last full week", "Taper 1", "Race week"
- longRun: string, e.g. "6 mi" or "50K" for week 11
- raceWeek: boolean, true only for week 11
- runs: array of { day: string (e.g. "Tue 3/10"), dist: string (e.g. "4 mi"), notes: string, long: boolean }
  Typical week: Tue easy, Thu easy, Sat long run, + 1 optional. Race week: Tue 3-4 mi, Thu 2-3 mi, Fri Rest, Sat 50K.`;

/** Generate an 11-week trail 50K plan using the user's Strava data and race info. */
export async function generatePlanWithAI(
  plan: PlanRecord,
  stravaSummary: string
): Promise<PlanWeek[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const raceDate = new Date(plan.raceDate + 'T12:00:00');
  const raceDateStr = raceDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const systemPrompt = `You are an expert running coach creating a personalized 11-week trail 50K training plan. The plan must be realistic given the athlete's current training and must follow this structure:
- 11 weeks total, ending on race day (week 11 = race week).
- Long run progression: 6, 8, 10, 11, 12, 14, 16, 18 mi for weeks 1-8, then 14 mi (week 9), 8 mi (week 10), and 50K race (week 11). Two-week taper.
- Each week: typically Tue easy, Thu easy, Sat long run, plus optional short run. Use "day" format like "Tue 3/10" with actual dates for the plan.
- If the athlete's recent volume is low or they have gaps, suggest a softer start (e.g. week 1 long run 4-5 mi instead of 6) and note it in the week's runs or phase.
- Output ONLY a valid JSON array of exactly 11 objects. No markdown, no code fence. ${PLAN_WEEK_JSON_SCHEMA}`;

  const userPrompt = `Race: ${plan.raceName}. Race date: ${raceDateStr} (Saturday). ${plan.raceUrl ? `Race link: ${plan.raceUrl}.` : ''}

Athlete's recent running (from Strava):
${stravaSummary}

Generate the 11-week plan as a JSON array. Use real dates for the plan based on race date (week 11 Saturday = race day). Each week object: num, range, miles, phase, longRun, raceWeek, runs (array of { day, dist, notes, long }).`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty response from OpenAI');

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\[[\s\S]*\]/);
    if (match) parsed = JSON.parse(match[0]);
    else throw new Error('Could not parse AI response as JSON');
  }

  const weeks = Array.isArray(parsed) ? parsed : (parsed as { weeks?: PlanWeek[] }).weeks ?? null;
  if (!weeks || weeks.length !== 11) {
    throw new Error('AI did not return 11 weeks');
  }

  // Normalize: ensure race week is week 11 and has 50K
  const normalized: PlanWeek[] = weeks.slice(0, 11).map((w: Record<string, unknown>, i: number) => ({
    num: i + 1,
    range: String(w.range ?? ''),
    miles: String(w.miles ?? (i === 10 ? '—' : '~0 mi')),
    phase: String(w.phase ?? ''),
    longRun: i === 10 ? '50K' : String(w.longRun ?? ''),
    raceWeek: i === 10,
    runs: Array.isArray(w.runs) ? (w.runs as { day: string; dist: string; notes: string; long?: boolean }[]).map((r) => ({
      day: String(r.day ?? ''),
      dist: String(r.dist ?? ''),
      notes: String(r.notes ?? ''),
      long: Boolean(r.long),
    })) : [],
  }));

  return normalized;
}
