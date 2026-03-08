'use client';

import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import type { PlanWeek } from '@/lib/plan-generator';

function WeekCard({ week }: { week: PlanWeek }) {
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
              {week.runs.map((r, i) => (
                <div key={i} className={'run-row' + (r.long ? ' long' : '')}>
                  <div className="run-row-top">
                    <span className="run-day">{r.day}</span>
                    <span className="run-dist">{r.dist}</span>
                    <span className="run-notes">{r.notes ?? ''}</span>
                  </div>
                  {r.coachTip?.trim() ? (
                    <div className="run-coach-tip">{r.coachTip.trim()}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}

function WeekCards({ weeks }: { weeks: PlanWeek[] }) {
  return (
    <>
      {weeks.map((week) => (
        <WeekCard key={week.num} week={week} />
      ))}
    </>
  );
}

/** Renders week cards into #weeksGrid (inside the injected plan HTML) so expand/collapse is stable. */
export default function PlanWeeksPortal({ weeks }: { weeks: PlanWeek[] }) {
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
