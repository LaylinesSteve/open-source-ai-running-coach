import type { PlanRecord, LoggedRun } from '@/lib/store';
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
- Also output "tips": an array of exactly 6 objects { "title": string, "description": string, "url": string (optional) }. Each tip should be about a topic that will interest this athlete given their goal, target time, recent training, and race distance—e.g. first marathon, trail/ultra fueling, taper, combining running with cross-training, injury prevention, pacing, mental preparation, race-day nutrition. Pick topics that match their situation so the tips feel personally relevant. For "url": only include a link if you know a real, working article URL that you are confident exists and matches the tip. Use full URLs to real articles from trusted sources (e.g. Runner's World, Trail Runner Magazine, iRunFar, Strength Running). Do not invent, guess, or construct URLs. If you are not certain a URL is valid and live, omit "url" for that tip—the tip will still display with title and description. It is better to have no URL than a broken link.
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

Generate the ${numWeeks}-week plan. Return JSON: { "weeks": [ ... ], "coachSummary": "...", "tips": [ ... ] } Use real dates. Each run: day, dist, notes, long, coachTip. Last week's longRun must be "${distance}". Include exactly 6 tips on topics that will interest this athlete; only add "url" when you are sure the link is a real, working article—otherwise omit "url".`;

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
  const tips: PlanTip[] = rawTips.slice(0, 6).map((t: { title?: string; description?: string; url?: string }) => ({
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

  const systemPrompt = `You are an expert running coach. The athlete has requested revisions to their ${numWeeks}-week ${distance} training plan. You will be given their context, current plan, their request, and (when available) previous revision requests and what you said in past responses. Maintain continuity: acknowledge prior context where relevant and keep your tone and advice consistent. Return a revised plan that addresses their request while keeping the same structure (same number of weeks, same race date ${raceDateStr}). Do not dictate taper; let the plan and their request guide any taper changes. Output ONLY valid JSON with keys "weeks" (array of ${numWeeks} week objects, same schema as before) and "coachSummary" (string: 2-3 sentences on what you changed and why). No markdown.`;

  const revisionHistory = (plan.revisionRequests ?? []).slice(-10);
  const coachHistory = (plan.coachSummaryHistory ?? []).slice(-10);
  const contextBlock = [
    revisionHistory.length
      ? `Previous revision requests (oldest to newest):\n${revisionHistory.map((r) => `- [${r.at}] "${r.request}"`).join('\n')}`
      : '',
    coachHistory.length
      ? `What you (the coach) said in previous responses (oldest to newest):\n${coachHistory.map((h) => `- [${h.at}] ${h.summary}`).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const syncContext =
    plan.lastSyncAt && plan.syncResult
      ? `Most recent Strava sync (${plan.lastSyncAt}): ${plan.syncResult.summary}.`
      : '';

  const userPrompt = `Race: ${plan.raceName}. Distance: ${distance}. Date: ${raceDateStr}.
${plan.goal ? `Goal: ${plan.goal}.` : ''} ${plan.targetTime ? `Target time: ${plan.targetTime}.` : ''} ${plan.additionalInfo ? `Additional context: ${plan.additionalInfo}.` : ''}
${contextBlock ? `\n${contextBlock}\n` : ''}
${syncContext ? `${syncContext}\n\n` : ''}

Recent training (Strava):
${stravaSummary}

Current plan (JSON):
${currentPlanJson}

Athlete's current revision request: ${userRequest}

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

export interface AdaptPlanResult {
  coachNote: string;
  suggestedWeeks?: { weekNum: number; suggestedMiles?: string; note?: string }[];
}

function getPlanStartDate(raceDate: string, weeks: number): Date {
  const d = new Date(raceDate + 'T12:00:00');
  d.setDate(d.getDate() - (weeks - 1) * 7 - 6);
  return d;
}

/** Build context string for adaptation: plan, current weeks, run log, sync summary. */
export function buildAdaptationContext(
  plan: PlanRecord,
  weeksData: PlanWeek[],
  runLog: LoggedRun[]
): string {
  const raceDate = new Date(plan.raceDate + 'T12:00:00');
  const raceDateStr = raceDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const distance = plan.distance || 'Marathon';

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const planStart = getPlanStartDate(plan.raceDate, plan.weeks || 12);
  const diffDays = Math.floor((now.getTime() - planStart.getTime()) / (24 * 60 * 60 * 1000));
  const currentWeekNum = Math.max(1, Math.min(plan.weeks || 12, Math.floor(diffDays / 7) + 1));
  const todayLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const lines: string[] = [
    '=== TODAY (use this to avoid treating in-progress weeks as missed) ===',
    `Today is ${todayLabel} (${todayStr}).`,
    `Current week in the plan is Week ${currentWeekNum}. Weeks run Monday–Sunday. Do NOT say the athlete has "missed" or is "behind" on a week when today is still within that week—they may have many days left to run. Only treat a week as complete or short once that week has ended (after Sunday).`,
    '',
    '=== RACE & GOALS ===',
    `Race: ${plan.raceName}. Distance: ${distance}. Race date: ${raceDateStr}.`,
    plan.goal ? `Goal: ${plan.goal}.` : '',
    plan.targetTime ? `Target time: ${plan.targetTime}.` : '',
    plan.additionalInfo ? `Additional context: ${plan.additionalInfo}.` : '',
    '',
    '=== CURRENT PLAN (weekly goals) ===',
    ...weeksData.map((w) => `Week ${w.num} (${w.range}): ${w.miles} — ${w.phase}${w.raceWeek ? ' [RACE WEEK]' : ''}`),
    '',
    '=== COMPLETED RUNS (run log) ===',
  ];

  if (runLog.length === 0) {
    lines.push('No runs logged yet.');
  } else {
    const byWeek = new Map<number, LoggedRun[]>();
    for (const r of runLog) {
      const list = byWeek.get(r.weekNum) ?? [];
      list.push(r);
      byWeek.set(r.weekNum, list);
    }
    const sortedWeeks = [...byWeek.entries()].sort((a, b) => a[0] - b[0]);
    for (const [weekNum, runs] of sortedWeeks) {
      const totalMi = runs.reduce((s, r) => s + r.distanceMi, 0);
      const planned = weeksData.find((w) => w.num === weekNum);
      const plannedMi = planned?.miles?.match(/\d+/) ? parseInt(planned.miles.replace(/\D/g, ''), 10) : null;
      const vs = plannedMi != null ? ` (planned ~${plannedMi} mi)` : '';
      lines.push(`Week ${weekNum}: ${runs.length} runs, ${Math.round(totalMi * 10) / 10} mi total${vs}`);
      for (const r of runs.slice().sort((a, b) => a.date.localeCompare(b.date))) {
        const timeStr = r.movingTimeSec != null ? `, ${Math.round(r.movingTimeSec / 60)} min` : '';
        const rpeStr = r.perceivedIntensity != null ? `, RPE ${r.perceivedIntensity}` : '';
        lines.push(`  ${r.date} ${r.name}: ${r.distanceMi} mi${timeStr}${rpeStr}`);
      }
    }
  }

  if (plan.lastSyncAt && plan.syncResult) {
    lines.push('');
    lines.push('=== SYNC SUMMARY ===');
    lines.push(`${plan.syncResult.summary} (last sync: ${plan.lastSyncAt}).`);
  }

  return lines.filter((s) => s !== undefined).join('\n');
}

/** Use AI to assess progress, suggest weekly adjustments, and write a coach note (recovery or encouragement). */
export async function adaptPlanWithAI(
  plan: PlanRecord,
  weeksData: PlanWeek[],
  runLog: LoggedRun[]
): Promise<AdaptPlanResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const context = buildAdaptationContext(plan, weeksData, runLog);
  const distance = plan.distance || 'Marathon';
  const numWeeks = weeksData.length;

  const systemPrompt = `You are an expert running coach. You will be given context that includes TODAY'S DATE and which week is the current (in-progress) week. Your job is to:

1. Use the "TODAY" section: only consider a week as complete or missed after that week has ended (after Sunday). If today is still within a week, do NOT say they have missed that week's target—they may have several days left to run.
2. Assess whether they are doing too much (need to ease off and recover), doing about right, or missing too much (need encouragement and practical tips to run a bit more). For the current week in progress, focus on what they've done so far, not on "missing" the weekly total yet.
3. Adjust the weekly plan and weekly goals: suggest concrete changes to upcoming weeks (e.g. reduce mileage for recovery, or keep/build as planned, or gentle nudge to hit a bit more). Focus on successive weeks from now; consider overall progress toward the race.
4. Write a short coach's note (2-4 sentences) that:
   - If they are overdoing it: emphasize recovery, sleep, easy days; suggest backing off the next week(s) and state it clearly.
   - If they are missing too much (only for weeks that have already ended): encourage them without guilt; give 1-2 practical tips to run a bit more.
   - If they're on track or the current week is still in progress: briefly affirm; do not suggest they are behind on the current week.

Use the exact context provided. Do not invent runs or numbers. Output ONLY a valid JSON object with:
- "coachNote": string (the 2-4 sentence note for the athlete)
- "suggestedWeeks": optional array of { "weekNum": number, "suggestedMiles": string (e.g. "~22 mi"), "note": string } for upcoming weeks that should change (only include weeks you want to suggest a change for)`;

  const userPrompt = `Context (use this as the single source of truth):

${context}

Race: ${plan.raceName}. ${distance}. Race date: ${plan.raceDate}.

Provide your assessment and coach note. Return JSON: { "coachNote": "...", "suggestedWeeks": [ ... ] }.`;

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
    throw new Error('Could not parse AI adaptation response as JSON');
  }

  const obj = parsed as { coachNote?: string; suggestedWeeks?: { weekNum: number; suggestedMiles?: string; note?: string }[] };
  const coachNote = typeof obj.coachNote === 'string' ? obj.coachNote.trim() : 'Keep building consistency.';
  const suggestedWeeks = Array.isArray(obj.suggestedWeeks)
    ? obj.suggestedWeeks
        .filter((w: { weekNum?: number }) => typeof w?.weekNum === 'number')
        .map((w: { weekNum: number; suggestedMiles?: string; note?: string }) => ({
          weekNum: w.weekNum,
          suggestedMiles: typeof w.suggestedMiles === 'string' ? w.suggestedMiles.trim() : undefined,
          note: typeof w.note === 'string' ? w.note.trim() : undefined,
        }))
    : undefined;

  return { coachNote, suggestedWeeks };
}
