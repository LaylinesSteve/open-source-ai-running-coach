/** Common race distances and default plan length in weeks. */
export const RACE_DISTANCE_OPTIONS: { value: string; label: string; weeks: number }[] = [
  { value: '5K', label: '5K', weeks: 6 },
  { value: '10K', label: '10K', weeks: 8 },
  { value: 'Half Marathon', label: 'Half Marathon', weeks: 10 },
  { value: 'Marathon', label: 'Marathon', weeks: 12 },
  { value: '50K', label: '50K', weeks: 11 },
  { value: '50 Mile', label: '50 Mile', weeks: 14 },
  { value: '100K', label: '100K', weeks: 16 },
  { value: '100 Mile', label: '100 Mile', weeks: 20 },
];

const WEEKS_BY_DISTANCE: Record<string, number> = Object.fromEntries(
  RACE_DISTANCE_OPTIONS.map((d) => [d.value, d.weeks])
);

export function getDefaultWeeksForDistance(distance: string): number {
  return WEEKS_BY_DISTANCE[distance] ?? 12;
}
