'use client';

import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import type { MergedWeek } from '@/lib/merge-runs';

function formatDuration(sec?: number): string {
  if (sec == null) return '';
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m} min`;
}

function WeekCard({ week }: { week: MergedWeek }) {
  const cardClass = 'week-card' + (week.raceWeek ? ' race-week' : '');
  return (
    <div className={cardClass}>
      <details>
        <summary className="week-card-header">
          <div>
            <div className="week-num">Week {week.num}</div>
            <div className="week-range">{week.range}</div>
          </div>
          <div className="week-meta">
            <span className="week-miles">{week.miles}</span>
            <span className="week-phase">{week.phase}</span>
            <span className="week-chevron">▼</span>
          </div>
        </summary>
        <div className="week-body">
          <div className="week-body-inner">
            <div className="week-runs">
              {week.runs.map((r, i) => {
                const isLong = r.planned?.long ?? false;
                const dist = r.actual != null
                  ? `${r.actual.distanceMi} mi`
                  : r.planned?.dist ?? '';
                const notes = r.actual != null
                  ? [r.actual.name, formatDuration(r.actual.movingTimeSec), r.actual.note].filter(Boolean).join(' · ')
                  : (r.planned?.notes ?? '');
                const coachTip = r.planned?.coachTip?.trim();
                return (
                  <div key={i} className={'run-row' + (isLong ? ' long' : '')}>
                    <div className="run-row-top">
                      <span className="run-day">{r.dayLabel}</span>
                      <span className="run-dist">{dist}</span>
                      <span className="run-notes">{notes}</span>
                    </div>
                    {coachTip ? <div className="run-coach-tip">{coachTip}</div> : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}

function WeekCards({ weeks }: { weeks: MergedWeek[] }) {
  return (
    <>
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
