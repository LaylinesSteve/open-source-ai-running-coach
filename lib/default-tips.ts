import type { PlanTip } from '@/lib/ai-plan';

const MARATHON_TIPS: PlanTip[] = [
  { title: 'Long run pace', description: 'Keep long runs easy—conversational pace. Save effort for race day.', url: 'https://www.runnersworld.com/advanced/a20803142/long-run-pace/' },
  { title: 'Race week', description: 'Short, easy runs only Tue/Thu; rest or walk Friday; race Saturday.', url: 'https://www.runnersworld.com/races-places/a20802242/taper-week-marathon/' },
  { title: 'Fueling', description: 'Practice race-day nutrition and hydration on 16–20 mi long runs.', url: 'https://www.runnersworld.com/nutrition-weight-loss/a20808689/marathon-nutrition/' },
  { title: 'Recovery', description: 'Sleep and easy days matter as much as the hard efforts. Don’t skip rest.', url: 'https://www.runnersworld.com/health-injuries/a20850426/recovery-runs/' },
];

const ULTRA_TIPS: PlanTip[] = [
  { title: 'Trail time', description: 'Get on trail for every long run and at least one other run per week.', url: 'https://www.trailrunnermag.com/training/trail-training-tips/' },
  { title: 'Walk when you need to', description: 'Power-hiking steep sections is part of ultra racing. Practice it.', url: 'https://www.trailrunnermag.com/training/power-hiking-ultra/' },
  { title: 'Back-to-backs', description: 'Optional: long run Saturday, 3–4 mi easy Sunday to simulate tired legs.', url: 'https://www.irunfar.com/back-to-back-long-runs' },
  { title: 'Fueling', description: 'Practice race-day nutrition and hydration on 14–18+ mi long runs.', url: 'https://www.trailrunnermag.com/nutrition/ultra-fueling-basics/' },
];

const SHORT_RACE_TIPS: PlanTip[] = [
  { title: 'Consistency', description: 'Three to four runs per week beats sporadic big weeks.', url: 'https://www.runnersworld.com/training/a20803142/5k-training/' },
  { title: 'Speed work', description: 'Include one workout (intervals or tempo) per week once base is set.', url: 'https://www.runnersworld.com/training/a20808689/interval-training/' },
  { title: 'Race week', description: 'Taper with a few short, easy runs. Rest the day before.', url: 'https://www.runnersworld.com/races-places/a20802242/taper-5k-10k/' },
];

/** Default tips when AI doesn't return any or for non-AI plans. */
export function getDefaultTips(distance: string): PlanTip[] {
  const d = distance?.toLowerCase() ?? '';
  if (d.includes('50') && (d.includes('mile') || d.includes('k')) || d.includes('100')) return ULTRA_TIPS;
  if (d.includes('5k') || d.includes('10k') || d.includes('half')) return SHORT_RACE_TIPS;
  return MARATHON_TIPS;
}
