'use client';

import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import type { MergedActual, MergedRun, MergedWeek } from '@/lib/merge-runs';
import { isPlannedWorkoutDone, sumMergedRunRunningMi } from '@/lib/merge-runs';
import { stravaActivityLabel } from '@/lib/strava';

function formatDuration(sec?: number): string {
  if (sec == null) return '';
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m} min`;
}

function formatActualNotes(actual: MergedActual): string {
  const typeHint =
    actual.activityType != null && actual.activityType !== ''
      ? stravaActivityLabel({ sport_type: actual.activityType, type: actual.activityType })
      : null;
  return [
    typeHint ? `[${typeHint}]` : null,
    actual.name,
    formatDuration(actual.movingTimeSec),
    actual.perceivedIntensity != null ? `RPE ${actual.perceivedIntensity}` : null,
    actual.note,
  ]
    .filter(Boolean)
    .join(' · ');
}

type DisplayRow = {
  key: string;
  dayLabel: string;
  dist: string;
  notes: string;
  coachTip?: string;
  isLong: boolean;
  done: boolean;
};

function buildDisplayRows(run: MergedRun, rowIndex: number): DisplayRow[] {
  const done = isPlannedWorkoutDone(run);
  const actuals = run.actuals ?? [];
  const plannedDist = run.planned?.dist?.trim() ?? '';
  const isRestPlanned = /rest|optional|\+ ?1 optional/i.test(plannedDist);
  const plannedHint =
    run.planned && plannedDist && !isRestPlanned ? `Planned: ${plannedDist}` : null;

  if (actuals.length === 0) {
    return [
      {
        key: `${run.dateStr}-planned-${rowIndex}`,
        dayLabel: run.dayLabel,
        dist: plannedDist,
        notes: run.planned?.notes ?? '',
        coachTip: run.planned?.coachTip?.trim(),
        isLong: run.planned?.long ?? false,
        done,
      },
    ];
  }

  return actuals.map((actual, i) => {
    const dist =
      actual.distanceMi > 0 ? `${actual.distanceMi} mi` : run.planned?.dist ?? '—';
    const notesParts = [formatActualNotes(actual)];
    if (i === 0 && plannedHint) notesParts.unshift(plannedHint);
    return {
      key: `${run.dateStr}-actual-${i}-${rowIndex}`,
      dayLabel: i === 0 ? run.dayLabel : '↳',
      dist,
      notes: notesParts.filter(Boolean).join(' · '),
      coachTip: i === 0 ? run.planned?.coachTip?.trim() : undefined,
      isLong: (run.planned?.long ?? false) && i === 0,
      done,
    };
  });
}

function WeekCard({ week }: { week: MergedWeek }) {
  const cardClass = 'week-card' + (week.raceWeek ? ' race-week' : '');
  const completedMi = week.runs.reduce((sum, r) => sum + sumMergedRunRunningMi(r), 0);
  const plannedNum = parseInt(week.miles.replace(/[^\d]/g, ''), 10) || 0;
  const milesLabel =
    plannedNum > 0
      ? `${Math.round(completedMi * 10) / 10} of ${plannedNum} mi`
      : week.miles;
  const milesComplete = plannedNum > 0 && completedMi >= plannedNum;

  const displayRows = week.runs.flatMap((r, i) => buildDisplayRows(r, i));

  return (
    <div className={cardClass}>
      <details>
        <summary className="week-card-header">
          <div>
            <div className="week-num">Week {week.num}</div>
            <div className="week-range">{week.range}</div>
          </div>
          <div className="week-meta">
            <span
              className="week-miles"
              style={milesComplete ? { color: 'var(--success, #22c55e)' } : undefined}
            >
              {milesLabel}
            </span>
            <span className="week-phase">{week.phase}</span>
            <span className="week-chevron">▼</span>
          </div>
        </summary>
        <div className="week-body">
          <div className="week-body-inner">
            <div className="week-runs">
              {displayRows.map((row) => (
                <div
                  key={row.key}
                  className={'run-row' + (row.isLong ? ' long' : '') + (row.done ? ' done' : '')}
                >
                  <div className="run-row-top">
                    <span className="run-day">
                      {row.done ? (
                        <span className="run-done-check" role="img" aria-label="Completed">
                          ✓
                        </span>
                      ) : null}
                      {row.dayLabel}
                    </span>
                    <span className="run-dist">{row.dist}</span>
                    <span className="run-notes">{row.notes}</span>
                  </div>
                  {row.coachTip ? <div className="run-coach-tip">{row.coachTip}</div> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}

/** Lives here rather than in the stored plan HTML so it applies to plans generated before it existed. */
const doneRowCss = `
#weeksGrid .run-row.done {
  background: rgba(34, 197, 94, 0.1);
  box-shadow: inset 3px 0 0 #22c55e;
  border-radius: 6px;
  padding-left: 0.65rem;
  padding-right: 0.65rem;
  margin: 2px 0;
}
#weeksGrid .run-row.done .run-dist,
#weeksGrid .run-row.done .run-day { color: #4ade80; }
#weeksGrid .run-done-check { margin-right: 0.3rem; font-weight: 700; }
`;

function WeekCards({ weeks }: { weeks: MergedWeek[] }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: doneRowCss }} />
      {weeks.map((week) => (
        <WeekCard key={week.num} week={week} />
      ))}
    </>
  );
}

/** Renders week cards into #weeksGrid (inside the injected plan HTML) so expand/collapse is stable. */
export default function PlanWeeksPortal({ weeks }: { weeks: MergedWeek[] }) {
  const rootRef = useRef<ReturnType<typeof createRoot> | null>(null);

  useEffect(() => {
    const el = document.getElementById('weeksGrid');
    if (!el || weeks.length === 0) return;
    const root = createRoot(el);
    rootRef.current = root;
    root.render(<WeekCards weeks={weeks} />);
    return () => {
      root.unmount();
      rootRef.current = null;
    };
  }, [weeks]);

  return null;
}
