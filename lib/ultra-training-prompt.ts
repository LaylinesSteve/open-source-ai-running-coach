/** Race distances that use ultramarathon-specific AI prompt guidance. */
const ULTRA_DISTANCES = new Set(['50K', '50 Mile', '100K', '100 Mile']);

export function isUltraDistance(distance: string): boolean {
  return ULTRA_DISTANCES.has(distance);
}

/**
 * Coaching concepts distilled from lower-volume ultramarathon periodization (e.g. progressive
 * hills, cross-training, back-to-backs, time-on-feet). Injected into AI prompts only for 50K+.
 */
export function ultraTrainingPromptBlock(distance: string): string {
  if (!isUltraDistance(distance)) return '';

  return `
ULTRAMARATHON (${distance}) — Apply these ideas when shaping weeks, phases, run descriptions, and coachTips (adapt volume to the athlete’s Strava history and week count; this is lower-volume–friendly ultra logic, not a prescriptive copy of any single plan):

**Volume & structure**
- Prefer sustainable weekly mileage with emphasis on durability, climbing, and fueling over chasing maximal miles.
- Periodize toward peak weeks that include longer time-on-feet and (when appropriate) back-to-back moderate weekend runs before the hardest blocks.
- Include a “camp” or time-on-feet emphasis in the late build (e.g. ~3–5 weeks before race): prioritize easy aerobic volume, heavy fueling practice, mental rehearsal, and resilient downhills—scale longest day to event distance (shorter for 50K, longer for 100M).

**Easy running**
- Many days should be truly easy or recovery; “shuffle” or slowest comfortable pace is fine when tired.
- The day before key long runs or hard sessions should stay extra chill.
- Easy runs: smooth, quick light strides, minimal tension; when feeling great, easy can drift slightly quicker only if it still feels easy and doesn’t compromise recovery.

**Long runs & terrain**
- Long runs are often easy-to-moderate on feel; it’s acceptable to work slightly more on uphills while staying controlled overall.
- Fueling and hydration practice on long runs is mandatory guidance in notes/coachTips.
- Trail specificity matters when the race is trail—surface, vert, and descent practice when possible.
- Downhills are a common limiter: practice strong but controlled descending; on pure easy days, be patient with legs on downs.

**Hills & power (low-impact stimulus)**
- Use short hill strides (e.g. ~20–45 s) on moderate grades (~6–8%) as VO2/power work with low orthopedic cost; jog-down recovery.
- Layer longer hill reps (e.g. ~90 s–3 min) at roughly 5K-type effort as “bread-and-butter” strength endurance.
- Occasionally combine hills with steady moderate running afterward to teach clearing lactate and running well on tired legs.

**Tempo / steady state**
- Include some steady moderate-to-hard aerobic pieces on rolling terrain or net uphill, framed as sustainable “~hour effort” or marathon-ish rhythm—not sprinting.
- Later build can include longer trail tempos that stress the muscular system for race demands.

**Cross-training**
- Non-impact options (bike, elliptical, uphill treadmill hike) count as real training: aim for aerobic strain without pounding.
- On cross-training, cadence can mirror running; “hard” segments are controlled resistance/cadence bumps, not all-out sprints.
- Optional short second sessions (doubles) can be easy cross-training when useful for aerobic volume without impact.

**Strength**
- Reference leg-specific strength for mountains/ultras in notes (e.g. hip/knee stability, downhill resilience)—keep prescriptions general unless the athlete gave equipment/access details.

**Hiking / time on feet**
- For longer ultras especially, optional hikes or run+hike days build specificity for hours on feet with lower risk than all-running volume.

**Taper & race week**
- Taper should preserve short neuromuscular sharpness (e.g. brief strides or short hills at modest effort) while leaning into recovery.
- Race-week messaging: start conservative, own fueling, respect downhills, stay positive.

**JSON output**
- You still output the same "runs" array schema; use "notes" and "coachTip" to describe cross-training, optional hikes, strength themes, doubles, or treadmill hill work when those replace or supplement a run. Label non-run days clearly in dist/notes (e.g. “XT: 60 min bike”, “Optional hike”).
`.trim();
}
