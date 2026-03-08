import type { PlanRecord } from '@/lib/store';
import type { PlanWeek } from '@/lib/plan-generator';
import { getDefaultWeeksForDistance } from '@/lib/race-distances';
import { refreshStravaToken, fetchStravaActivities, type StravaActivity } from '@/lib/strava';
import { getPlan, updatePlan } from '@/lib/store';

const FIVE_MINUTES = 5 * 60;

/** Gemini model for plan generation; override with GEMINI_MODEL env (e.g. gemini-2.5-flash, gemini-3-flash-preview). */
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

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
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const recent = runs.filter((r) => new Date(r.start_date) >= sixMonthsAgo);
  if (recent.length === 0) return 'No runs in the last 6 months.';

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
    `Total runs (last 6 months): ${recent.length}.`,
    `Weekly summary (week starting Monday):`,
  ];
  for (const [weekStart, { count, miles, longest }] of sortedWeeks.slice(-26)) {
    lines.push(`  ${weekStart}: ${count} runs, ${miles.toFixed(1)} mi, longest run ${longest.toFixed(1)} mi`);
  }
  const totalMi = recent.reduce((s, r) => s + (r.distance ?? 0) / 1609.34, 0);
  const avgPerRun = totalMi / recent.length;
  lines.push(`Overall: ~${totalMi.toFixed(0)} mi total, ~${avgPerRun.toFixed(1)} mi/run average.`);
  return lines.join('\n');
}

const PLAN_WEEK_JSON_SCHEMA = (n: number, distance: string) => `Each week must be a JSON object with:
- num: number (1-${n})
- range: string, e.g. "Mar 7–13" (Monday–Sunday of that week)
- miles: string, e.g. "~16 mi" or "—" for race week
- phase: string, e.g. "Base", "Build", "Peak", "Race week" (taper length/structure is up to you)
- longRun: string, e.g. "6 mi" or "${distance}" for the final (race) week
- raceWeek: boolean, true only for week ${n}
- runs: array of { day: string, dist: string, notes: string, long: boolean, coachTip: string }
  For EACH run include "coachTip": a short line (1-2 sentences) of what a professional coach would say—motivation, a concrete tip, or an idea (e.g. pace focus, form cue, mindset, fueling, terrain). Keep it specific to that run and the athlete's context.
  Typical week: Tue easy, Thu easy, Sat long run, + 1 optional. Race week: short runs Tue/Thu, Rest Fri, race Saturday.`;

export interface PlanTip {
  title: string;
  description: string;
  url?: string;
}

export interface GeneratePlanResult {
  weeks: PlanWeek[];
  coachSummary: string;
  tips?: PlanTip[];
}

/** Generate a personalized training plan for the selected distance using Strava data and race info (Gemini). */
export async function generatePlanWithAI(
  plan: PlanRecord,
  stravaSummary: string
): Promise<GeneratePlanResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const distance = plan.distance || 'Marathon';
  const numWeeks = plan.weeks || getDefaultWeeksForDistance(distance);
  const raceDate = new Date(plan.raceDate + 'T12:00:00');
  const raceDateStr = raceDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const systemPrompt = `You are an expert running coach creating a personalized ${numWeeks}-week training plan for a ${distance} race. The plan must be realistic given the athlete's current training.
- ${numWeeks} weeks total, ending on race day (week ${numWeeks} = race week). Include an appropriate taper before race day; let the athlete's context and distance guide taper length and structure—do not dictate a fixed taper.
- Long run progression should fit the race distance: for shorter races (5K, 10K) use lower mileage; for marathon/ultra build to appropriate peak long runs.
- Each week: typically Tue easy, Thu easy, Sat long run, plus optional short run. Use "day" format like "Tue 3/10" with actual dates so the last Saturday is ${raceDateStr}.
- If the athlete's recent volume is low, suggest a softer start and note it in the week's runs or phase.
- Use the athlete's goal, target time (if any), and any extra context to tailor advice.
- Also output "coachSummary": a short paragraph (2-4 sentences) summarizing the athlete's recent training and how it informed the plan.
- Also output "tips": an array of 4-6 objects { "title": string, "description": string, "url": string (optional) } with personalized tips and useful links for this runner (based on distance, goal, context). Include at least 2 tips with real "url" links to quality training articles, race prep, or nutrition (use real URLs from trusted sources you know).
- Output ONLY a valid JSON object with keys "weeks", "coachSummary", and "tips". No markdown, no code fence. ${PLAN_WEEK_JSON_SCHEMA(numWeeks, distance)}`;

  const raceContext = [
    `Race: ${plan.raceName}. Distance: ${distance}. Race date: ${raceDateStr} (Saturday).`,
    plan.raceUrl ? `Race link (use for course/terrain context if known): ${plan.raceUrl}.` : null,
    plan.goal ? `Athlete's goal: ${plan.goal}.` : null,
    plan.targetTime ? `Target time: ${plan.targetTime}.` : null,
    plan.additionalInfo ? `Additional context: ${plan.additionalInfo}.` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const userPrompt = `${raceContext}

Athlete's recent running (from Strava):
${stravaSummary}

Generate the ${numWeeks}-week plan. Return JSON: { "weeks": [ ... ], "coachSummary": "...", "tips": [ { "title": "...", "description": "...", "url": "..." optional } ] } Use real dates. Each run: day, dist, notes, long, coachTip. Last week's longRun must be "${distance}". Include 4-6 tips with at least 2 having real URLs.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await res.json();
  const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text;
  const content = textPart?.trim();
  if (!content) throw new Error('Empty response from Gemini');

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\[[\s\S]*\]/);
    if (match) parsed = JSON.parse(match[0]);
    else throw new Error('Could not parse AI response as JSON');
  }

  const obj = parsed as { weeks?: PlanWeek[]; coachSummary?: string; tips?: PlanTip[] };
  const rawWeeks = Array.isArray(parsed) ? parsed : obj.weeks ?? null;
  if (!rawWeeks || rawWeeks.length < 1) {
    throw new Error('AI did not return any weeks');
  }

  const n = rawWeeks.length;
  const raceLabel = plan.distance || 'Marathon';

  // Normalize: ensure last week is race week with correct label
  const normalized: PlanWeek[] = rawWeeks.slice(0, n).map((w: Record<string, unknown>, i: number) => ({
    num: i + 1,
    range: String(w.range ?? ''),
    miles: String(w.miles ?? (i === n - 1 ? '—' : '~0 mi')),
    phase: String(w.phase ?? ''),
    longRun: i === n - 1 ? raceLabel : String(w.longRun ?? ''),
    raceWeek: i === n - 1,
    runs: Array.isArray(w.runs) ? (w.runs as { day: string; dist: string; notes: string; long?: boolean; coachTip?: string }[]).map((r) => ({
      day: String(r.day ?? ''),
      dist: String(r.dist ?? ''),
      notes: String(r.notes ?? ''),
      long: Boolean(r.long),
      coachTip: typeof r.coachTip === 'string' ? r.coachTip.trim() : '',
    })) : [],
  }));

  const coachSummary = typeof obj.coachSummary === 'string' ? obj.coachSummary.trim() : '';
  const rawTips = Array.isArray(obj.tips) ? obj.tips : [];
  const tips: PlanTip[] = rawTips.slice(0, 8).map((t: { title?: string; description?: string; url?: string }) => ({
    title: String(t?.title ?? '').trim() || 'Tip',
    description: String(t?.description ?? '').trim() || '',
    url: typeof t?.url === 'string' && t.url.trim() ? t.url.trim() : undefined,
  })).filter((t) => t.description);
  return { weeks: normalized, coachSummary, tips };
}

/** Revise the plan based on user feedback; returns updated weeks and coach summary. */
export async function revisePlanWithAI(
  plan: PlanRecord,
  stravaSummary: string,
  currentWeeks: PlanWeek[],
  userRequest: string
): Promise<GeneratePlanResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const distance = plan.distance || 'Marathon';
  const numWeeks = currentWeeks.length;
  const raceDate = new Date(plan.raceDate + 'T12:00:00');
  const raceDateStr = raceDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const currentPlanJson = JSON.stringify(
    currentWeeks.map((w) => ({ num: w.num, range: w.range, miles: w.miles, phase: w.phase, longRun: w.longRun, raceWeek: w.raceWeek, runs: w.runs })),
    null,
    2
  );

  const systemPrompt = `You are an expert running coach. The athlete has requested revisions to their ${numWeeks}-week ${distance} training plan. You will be given their context, current plan, and their request. Return a revised plan that addresses their request while keeping the same structure (same number of weeks, same race date ${raceDateStr}). Do not dictate taper; let the plan and their request guide any taper changes. Output ONLY valid JSON with keys "weeks" (array of ${numWeeks} week objects, same schema as before) and "coachSummary" (string: 2-3 sentences on what you changed and why). No markdown.`;

  const userPrompt = `Race: ${plan.raceName}. Distance: ${distance}. Date: ${raceDateStr}.
${plan.goal ? `Goal: ${plan.goal}.` : ''} ${plan.targetTime ? `Target time: ${plan.targetTime}.` : ''} ${plan.additionalInfo ? `Additional context: ${plan.additionalInfo}.` : ''}

Recent training (Strava):
${stravaSummary}

Current plan (JSON):
${currentPlanJson}

Athlete's revision request: ${userRequest}

Return JSON: { "weeks": [ ... ], "coachSummary": "..." }. Each run must have day, dist, notes, long, and coachTip (1-2 sentences of coach voice: motivation, tip, or idea). Keep real dates; last week's longRun must be "${distance}".`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!content) throw new Error('Empty response from Gemini');

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Could not parse AI revision response as JSON');
  }

  const obj = parsed as { weeks?: PlanWeek[]; coachSummary?: string };
  const rawWeeks = obj.weeks ?? null;
  if (!rawWeeks || rawWeeks.length < 1) {
    throw new Error('AI did not return any weeks');
  }

  const n = Math.min(rawWeeks.length, numWeeks);
  const raceLabel = plan.distance || 'Marathon';
  const rawSlice = rawWeeks.slice(0, n) as unknown as Record<string, unknown>[];
  const normalized: PlanWeek[] = rawSlice.map((w, i) => ({
    num: i + 1,
    range: String(w.range ?? ''),
    miles: String(w.miles ?? (i === n - 1 ? '—' : '~0 mi')),
    phase: String(w.phase ?? ''),
    longRun: i === n - 1 ? raceLabel : String(w.longRun ?? ''),
    raceWeek: i === n - 1,
    runs: Array.isArray(w.runs) ? (w.runs as { day: string; dist: string; notes: string; long?: boolean; coachTip?: string }[]).map((r) => ({
      day: String(r.day ?? ''),
      dist: String(r.dist ?? ''),
      notes: String(r.notes ?? ''),
      long: Boolean(r.long),
      coachTip: typeof r.coachTip === 'string' ? r.coachTip.trim() : '',
    })) : [],
  }));

  const coachSummary = typeof obj.coachSummary === 'string' ? obj.coachSummary.trim() : 'Plan updated based on your feedback.';
  return { weeks: normalized, coachSummary };
}
