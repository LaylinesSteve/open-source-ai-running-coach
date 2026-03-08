import type { PlanTip } from '@/lib/ai-plan';

// Use stable section/homepage URLs that resolve (no article IDs that 404).
const RW_TRAINING = 'https://www.runnersworld.com/training/';
const RW_NUTRITION = 'https://www.runnersworld.com/nutrition/';
const RW_RACES = 'https://www.runnersworld.com/races-places/';
const TRAIL_RUNNER = 'https://trailrunnermag.com/';
const IRUNFAR = 'https://www.irunfar.com/';

const MARATHON_TIPS: PlanTip[] = [
  { title: 'Long run pace', description: 'Keep long runs easy—conversational pace. Save effort for race day.', url: RW_TRAINING },
  { title: 'Race week', description: 'Short, easy runs only Tue/Thu; rest or walk Friday; race Saturday.', url: RW_RACES },
  { title: 'Fueling', description: 'Practice race-day nutrition and hydration on 16–20 mi long runs.', url: RW_NUTRITION },
  { title: 'Recovery', description: 'Sleep and easy days matter as much as the hard efforts. Don’t skip rest.', url: RW_TRAINING },
];

const ULTRA_TIPS: PlanTip[] = [
  { title: 'Trail time', description: 'Get on trail for every long run and at least one other run per week.', url: TRAIL_RUNNER },
  { title: 'Walk when you need to', description: 'Power-hiking steep sections is part of ultra racing. Practice it.', url: TRAIL_RUNNER },
  { title: 'Back-to-backs', description: 'Optional: long run Saturday, 3–4 mi easy Sunday to simulate tired legs.', url: IRUNFAR },
  { title: 'Fueling', description: 'Practice race-day nutrition and hydration on 14–18+ mi long runs.', url: TRAIL_RUNNER },
];

const SHORT_RACE_TIPS: PlanTip[] = [
  { title: 'Consistency', description: 'Three to four runs per week beats sporadic big weeks.', url: RW_TRAINING },
  { title: 'Speed work', description: 'Include one workout (intervals or tempo) per week once base is set.', url: RW_TRAINING },
  { title: 'Race week', description: 'Taper with a few short, easy runs. Rest the day before.', url: RW_RACES },
];

/** Default tips when AI doesn't return any or for non-AI plans. */
export function getDefaultTips(distance: string): PlanTip[] {
  const d = distance?.toLowerCase() ?? '';
  if (d.includes('50') && (d.includes('mile') || d.includes('k')) || d.includes('100')) return ULTRA_TIPS;
  if (d.includes('5k') || d.includes('10k') || d.includes('half')) return SHORT_RACE_TIPS;
  return MARATHON_TIPS;
}
