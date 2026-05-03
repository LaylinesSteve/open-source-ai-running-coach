/** Race distances that use ultramarathon-specific AI prompt guidance. */
const ULTRA_DISTANCES = new Set(['50K', '50 Mile', '100K', '100 Mile']);

export function isUltraDistance(distance: string): boolean {
  return ULTRA_DISTANCES.has(distance);
}

/**
 * Coaching concepts aligned with lower-volume ultramarathon periodization (e.g. SWAP-style plans:
 * sustainable miles, hills + tempo, cross-training, back-to-back long runs, camp/time-on-feet).
 * Injected into AI prompts only for 50K+. Not a copy of any single commercial plan—general principles only.
 */
export function ultraTrainingPromptBlock(distance: string): string {
  if (!isUltraDistance(distance)) return '';

  return `
ULTRAMARATHON (${distance}) — Shape weeks using lower-volume ultra logic: durability, climbing, fueling, and time-on-feet over raw mileage. Adapt week count and volume to the athlete’s Strava baseline and goals.

**Weekly rhythm (Monday–Sunday)**
- Think in full weeks like a trail-ultra calendar: protect recovery around the hardest stimuli (especially before weekend loading).
- The day before the primary weekly long run should be extra easy—shuffle or slowest comfortable pace is fine; optional non-impact cross-training only if preferred.
- Before a big mid-week workout (hills + tempo, long hill session, or threshold-style rolling run), keep the prior day lower stress when possible.

**Back-to-back long runs (“weekend sandwich”)**
- Regularly schedule **back-to-back** weekend runs to practice **running on tired legs**—the Sunday (or second day) should feel like sustained easy aerobic work after Saturday’s longer or more demanding day.
- Progress thoughtfully: early cycles can use modest Sat + shorter Sun (both mostly easy trail); later build increases time-on-feet or Saturday intensity while Sunday stays controlled easy aerobic.
- Purpose is adaptation to cumulative fatigue and mental rehearsal for ultra pacing—not two race efforts. Fuel both days; emphasize patience on downhills on the second day.
- For 50K, keep back-to-backs shorter in total duration than for 50M/100K/100M; scale peak weekend load to event distance.

**Camp / simulation weekend (late build)**
- Roughly **3–5 weeks before the race**, include a **camp-style** emphasis: a single weekend with **high easy aerobic time-on-feet**, heavy fueling and hydration practice, ultra mindset, and **strong but controlled downhills**.
- Intensity stays mostly easy; volume is the teacher. Scale the longest day toward race distance (modest for 50K; substantially longer for 100M—optionally with walk/hike allowances).
- Surrounding days stay extra chill; consider dropping heavy gym legs that week if notes mention strength.

**Long runs & terrain**
- Long runs are often easy-to-moderate on feel; slightly more work on uphills is OK if globally controlled.
- Mandate fueling/hydration coaching in notes and coachTips on every substantive long run.
- Trail and vert specificity when the race is trail; practice descending as a limiter skill.
- Optional **long hike** layered on weekends or as a second stimulus builds hours on feet with less impact than all-running volume—especially useful for 100K/100M.

**Hills, power, and “tired legs” sessions**
- Short hill strides (~20–45 s, moderate grade ~6–8%): powerful VO2/neuromuscular stimulus with low pounding; full jog-down recovery.
- Longer hill reps (~90 s–3 min) at roughly **5K-type effort** are core strength-endurance work.
- **Combine hills with steady moderate running afterward** so the athlete practices **clearing lactate and maintaining rhythm on tired legs**—a hallmark of quality ultra prep.
- Occasional **rolling tempo** or moderate steady blocks (~“sustainable hour effort” / marathon-ish rhythm on rolling terrain), including net-uphill options where terrain allows.

**Cross-training (real training, not filler)**
- Bike, elliptical, **uphill treadmill hike/run (“treadmill vert”)**, or ski: aerobic strain with **minimal impact**. Cadence can mirror running; “hard” bits are controlled resistance/cadence, not sprints.
- Structured XT intervals are fair game (e.g. short repeats like 1 min firm / 1–2 min easy, or pyramids), framed as **aerobic power** without race-level suffering.
- Optional **easy doubles** (short second session hours apart or adjacent to an easy run) add volume without extra pounding.

**Strength**
- Rotate themes in notes/coachTips: **general strength** for climbing resilience vs **ultra-specific leg durability** (heavy-ish patterns only if appropriate; keep prescriptions general unless the athlete gave equipment access).
- Heavy strength days often pair better after easier run days or with awareness that legs may feel heavy the next day.

**Run + hike stacks (longer ultras)**
- For 100K/100M, occasional **short easy run plus a longer same-day hike** (or very long hike-only day) builds **hours on feet** with limited impact—full fueling as on race day.

**Easy running**
- Many days truly easy or recovery; smooth relaxed strides, low tension.
- When the athlete feels great, easy pace can drift slightly quicker only if recovery stays intact.

**Taper & race week**
- Preserve brief **neuromuscular sharpness** (short strides or modest hills—not smash sessions) while leaning into recovery.
- Race-week messaging: start conservative, own fueling, respect downhills, stay positive.

**JSON output**
- Same "runs" array schema. Use dist/notes/coachTip for XT (e.g. “XT: 60–90 min bike, 12×1 min firm / 2 min easy”), optional hikes, treadmill vert, strength themes, doubles, or hill+tempo combos. Label rest or optional days clearly.
`.trim();
}
