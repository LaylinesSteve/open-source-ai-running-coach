import type { PlanWeek } from '@/lib/plan-generator';
import { progressBarData } from '@/lib/plan-progress';

const scopedCss = `
.plan-long-run-progress {
  --bg: #0a0a0a;
  --surface: #141414;
  --text: #f5f5f5;
  --text-muted: #737373;
  --accent: #e85d04;
  --accent-bright: #ff6b1a;
  --border: #262626;
  --success: #22c55e;
}
.plan-long-run-progress.section-wrap {
  max-width: 1100px;
  margin: 0 auto;
}
.plan-long-run-progress .progress-section {
  background: var(--surface);
  padding: 4rem 1.5rem;
}
.plan-long-run-progress .section-label {
  font-size: 0.7rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 0.5rem;
}
.plan-long-run-progress .section-title.font-display {
  font-family: 'Bebas Neue', sans-serif;
  letter-spacing: 0.02em;
  font-size: clamp(2rem, 5vw, 3rem);
  margin-bottom: 2rem;
}
.plan-long-run-progress .progress-grid {
  display: grid;
  gap: 0.5rem;
  align-items: stretch !important;
  height: 240px;
  margin-top: 1.5rem;
}
.plan-long-run-progress .progress-bar-wrap {
  height: 100% !important;
  display: flex;
  flex-direction: column;
  justify-content: flex-end !important;
  align-items: center;
}
.plan-long-run-progress .progress-bar {
  width: 100%;
  min-height: 8px;
  background: linear-gradient(180deg, var(--accent) 0%, var(--accent-bright) 100%);
  border-radius: 4px 4px 0 0;
}
.plan-long-run-progress .progress-bar.race {
  background: linear-gradient(180deg, var(--success) 0%, #4ade80 100%);
}
.plan-long-run-progress .progress-bar.taper {
  background: linear-gradient(180deg, var(--text-muted) 0%, #525252 100%);
}
.plan-long-run-progress .progress-label {
  margin-top: 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
}
.plan-long-run-progress .progress-date {
  font-size: 0.6rem;
  color: var(--text-muted);
}
@media (max-width: 768px) {
  .plan-long-run-progress .progress-grid {
    grid-template-columns: repeat(6, 1fr) !important;
    height: 280px;
  }
}
`;

export default function LongRunProgress({ weeks }: { weeks: PlanWeek[] }) {
  const bars = progressBarData(weeks);
  const gridCols = Math.min(weeks.length, 52);

  return (
    <div className="plan-long-run-progress section-wrap">
      <style dangerouslySetInnerHTML={{ __html: scopedCss }} />
      <section className="progress-section" id="progress">
        <p className="section-label">Long run progression</p>
        <h2 className="section-title font-display">Build to race day</h2>
        <div
          className="progress-grid"
          style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
        >
          {bars.map((d) => (
            <div className="progress-bar-wrap" key={d.weekNum} data-week={d.weekNum}>
              <div className={`progress-bar ${d.barClass}`.trim()} style={{ height: `${d.pct}%` }} />
              <span className="progress-label">{d.longRun}</span>
              <span className="progress-date">{d.datePart}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
