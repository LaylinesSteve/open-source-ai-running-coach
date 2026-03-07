/**
 * Generates a trail 50K-style training plan from race date and optional Strava baseline.
 * Same structure as the static plan: 11 weeks, long runs 6→8→10→11→12→14→16→18, then 2-week taper.
 */

export interface PlanWeek {
  num: number;
  range: string;
  miles: string;
  phase: string;
  longRun: string;
  runs: { day: string; dist: string; notes: string; long?: boolean }[];
  raceWeek?: boolean;
}

function formatDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

export function generatePlanWeeks(raceDate: Date): PlanWeek[] {
  // Race = week 11 Saturday. Week 1 Saturday = 10 weeks before race.
  const raceSat = new Date(raceDate);
  raceSat.setHours(12, 0, 0, 0);
  const weekSaturdays: Date[] = [];
  for (let w = 0; w < 11; w++) {
    weekSaturdays.push(addDays(raceSat, -7 * (10 - w))); // week 0 = 70 days before, week 10 = race day
  }

  const longRuns = [6, 8, 10, 11, 12, 14, 16, 18, 14, 8, 0]; // week 11 = race
  const weeklyMi = [16, 18, 20, 22, 24, 26, 28, 28, 26, 18, 0];
  const phases = [
    'Base',
    'Build',
    'Build',
    'Build',
    'Build',
    'Build',
    'Peak',
    'Peak',
    'Last full week',
    'Taper 1',
    'Race week',
  ];

  const weeks: PlanWeek[] = [];
  for (let i = 0; i < 11; i++) {
    const sat = weekSaturdays[i];
    const mon = addDays(sat, -6);
    const range = `${formatDate(mon)}–${formatDate(sat)}`;
    const isRaceWeek = i === 10;
    const longRun = isRaceWeek ? '50K' : `${longRuns[i]} mi`;
    const miles = isRaceWeek ? '—' : `~${weeklyMi[i]} mi`;

    const tue = addDays(sat, -4);
    const thu = addDays(sat, -2);

    const runDay = (d: Date) => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const m = d.getMonth() + 1;
      const day = d.getDate();
      return `${days[d.getDay()]} ${m}/${day}`;
    };

    const runs =
      i < 10
        ? [
            { day: runDay(tue), dist: i >= 3 ? '5 mi' : '4 mi', notes: '', long: false },
            { day: runDay(thu), dist: i === 6 || i === 8 ? '6 mi' : i >= 4 ? '5 mi' : '4 mi', notes: '', long: false },
            {
              day: runDay(sat),
              dist: longRun,
              notes: isRaceWeek ? 'Race day' : i === 0 ? 'Long run — easy, trail if possible' : i === 9 ? 'Long run — easy, last long before race' : 'Long run — trail',
              long: true,
            },
            { day: i < 9 ? '+ 1 optional' : 'Optional', dist: i === 9 ? '2 mi' : i >= 6 ? '1–2 mi' : '2–3 mi', notes: '', long: false },
          ]
        : [
            { day: runDay(addDays(sat, -4)), dist: '3–4 mi', notes: 'Keep legs moving', long: false },
            { day: runDay(addDays(sat, -2)), dist: '2–3 mi', notes: 'Optional', long: false },
            { day: runDay(addDays(sat, -1)), dist: 'Rest', notes: 'Or 20 min walk', long: false },
            { day: runDay(sat), dist: '50K', notes: 'Race day', long: true },
          ];

    weeks.push({
      num: i + 1,
      range,
      miles,
      phase: phases[i],
      longRun,
      runs,
      raceWeek: isRaceWeek,
    });
  }
  return weeks;
}

export function planWeeksToHtml(
  weeks: PlanWeek[],
  raceName: string,
  raceDate: string,
  raceUrl: string
): string {
  const raceDateFormatted = new Date(raceDate + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const startDate = weeks[0]?.range?.split('–')[0] || '';
  const endDate = weeks[10]?.range?.split('–')[1] || raceDateFormatted;

  const longRunToPct = (lr: string): number => {
    if (/50k|50K|race/i.test(lr)) return 100;
    const n = parseInt(lr.replace(/[^\d]/g, ''), 10);
    if (Number.isNaN(n)) return 25;
    return Math.min(64, Math.round((n / 18) * 64)) || 21;
  };

  const progressBars = weeks.map((w, i) => {
    const isTaper = w.phase.includes('Taper') && !w.raceWeek;
    const isRace = w.raceWeek;
    const pct = isRace ? 100 : longRunToPct(w.longRun);
    const barClass = isRace ? 'race' : isTaper ? 'taper' : '';
    const label = w.longRun;
    const datePart = w.range.split('–')[0];
    return `<div class="progress-bar-wrap" data-week="${w.num}"><div class="progress-bar ${barClass}" style="height: ${pct}%;"></div><span class="progress-label">${label}</span><span class="progress-date">${datePart}</span></div>`;
  }).join('\n      ');

  const weeksJson = JSON.stringify(weeks);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${raceName} · ${raceDateFormatted}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root { --bg: #0a0a0a; --surface: #141414; --text: #f5f5f5; --text-muted: #737373; --accent: #e85d04; --accent-bright: #ff6b1a; --border: #262626; --success: #22c55e; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; overflow-x: hidden; }
    .font-display { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.02em; }
    .hero { min-height: 80vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 2rem; position: relative; background: radial-gradient(ellipse 80% 50% at 50% 120%, rgba(232, 93, 4, 0.15) 0%, transparent 50%), var(--bg); }
    .hero h1 { font-size: clamp(3rem, 12vw, 8rem); line-height: 0.95; margin-bottom: 0.5rem; }
    .hero .sub { font-size: clamp(1rem, 2.5vw, 1.25rem); color: var(--text-muted); letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 1rem; }
    .hero .date { font-size: clamp(1.5rem, 5vw, 2.5rem); color: var(--accent); }
    .hero .weeks { margin-top: 2rem; padding: 0.5rem 1rem; border: 1px solid var(--border); font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-muted); }
    .hero a { color: var(--accent); font-size: 0.85rem; margin-top: 1rem; }
    section { max-width: 1100px; margin: 0 auto; padding: 4rem 1.5rem; }
    .section-label { font-size: 0.7rem; letter-spacing: 0.25em; text-transform: uppercase; color: var(--accent); margin-bottom: 0.5rem; }
    .section-title { font-size: clamp(2rem, 5vw, 3rem); margin-bottom: 2rem; }
    .progress-section { background: var(--surface); padding: 4rem 1.5rem; }
    .progress-grid { display: grid; grid-template-columns: repeat(11, 1fr); gap: 0.5rem; align-items: end; height: 240px; margin-top: 1.5rem; }
    .progress-bar-wrap { display: flex; flex-direction: column; align-items: center; }
    .progress-bar { width: 100%; min-height: 20px; background: linear-gradient(180deg, var(--accent) 0%, var(--accent-bright) 100%); border-radius: 4px 4px 0 0; }
    .progress-bar.race { background: linear-gradient(180deg, var(--success) 0%, #4ade80 100%); }
    .progress-bar.taper { background: linear-gradient(180deg, var(--text-muted) 0%, #525252 100%); }
    .progress-label { margin-top: 0.5rem; font-size: 0.7rem; font-weight: 600; }
    .progress-date { font-size: 0.6rem; color: var(--text-muted); }
    .week-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; margin-bottom: 0.75rem; }
    .week-card-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; padding: 1rem 1.25rem; cursor: pointer; }
    .week-num { font-size: 0.65rem; letter-spacing: 0.2em; color: var(--text-muted); }
    .week-range { font-size: 0.95rem; font-weight: 600; }
    .week-meta { display: flex; align-items: center; gap: 1rem; }
    .week-miles { font-family: 'Bebas Neue', sans-serif; font-size: 1.5rem; color: var(--accent); }
    .week-card.race-week .week-miles { color: var(--success); }
    .week-phase { font-size: 0.65rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-muted); padding: 0.2rem 0.4rem; border: 1px solid var(--border); border-radius: 4px; }
    .week-chevron { color: var(--text-muted); transition: transform 0.2s; }
    .week-card.open .week-chevron { transform: rotate(180deg); color: var(--accent); }
    .week-body { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; }
    .week-card.open .week-body { max-height: 400px; }
    .week-body-inner { padding: 0 1.25rem 1.25rem; border-top: 1px solid var(--border); }
    .run-row { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border); font-size: 0.85rem; }
    .run-row:last-child { border-bottom: none; }
    .run-day { font-weight: 600; color: var(--text-muted); min-width: 85px; }
    .run-dist { font-weight: 600; color: var(--accent); }
    .run-row.long .run-dist { color: var(--accent-bright); }
    .run-notes { color: var(--text-muted); font-size: 0.8rem; }
    .cta-section { text-align: center; padding: 4rem 1.5rem; background: var(--surface); }
    .cta-section .date-big { font-size: clamp(2.5rem, 8vw, 4rem); color: var(--accent); margin: 1rem 0; }
    @media (max-width: 768px) { .progress-grid { grid-template-columns: repeat(6, 1fr); height: 280px; } }
  </style>
</head>
<body>
  <header class="hero">
    <h1 class="font-display">50K</h1>
    <p class="sub">Trail</p>
    <p class="date font-display">${raceDateFormatted}</p>
    <p class="weeks">11 Weeks · ${startDate} → ${endDate}</p>
    ${raceUrl ? `<a href="${raceUrl}" target="_blank" rel="noopener">Race info</a>` : ''}
  </header>
  <section class="progress-section" id="progress">
    <p class="section-label">Long run progression</p>
    <h2 class="section-title font-display">Build to race day</h2>
    <div class="progress-grid">
      ${progressBars}
    </div>
  </section>
  <section id="weeks">
    <p class="section-label">Weekly plan</p>
    <h2 class="section-title font-display">11 weeks</h2>
    <div class="weeks-grid" id="weeksGrid"></div>
  </section>
  <section class="cta-section">
    <p class="section-label">Race day</p>
    <h2 class="section-title font-display">${raceName}</h2>
    <p class="date-big font-display">${raceDateFormatted}</p>
    <p style="color: var(--text-muted);">Save this page. You’ve got this.</p>
  </section>
  <script>
    const weeksData = ${weeksJson};
    const grid = document.getElementById('weeksGrid');
    weeksData.forEach(function(week) {
      const card = document.createElement('div');
      card.className = 'week-card' + (week.raceWeek ? ' race-week' : '');
      card.innerHTML = '<div class="week-card-header"><div><div class="week-num">Week ' + week.num + '</div><div class="week-range">' + week.range + '</div></div><div class="week-meta"><span class="week-miles">' + week.miles + '</span><span class="week-phase">' + week.phase + '</span><span class="week-chevron">▼</span></div></div><div class="week-body"><div class="week-body-inner"><div class="week-runs">' + week.runs.map(function(r) { return '<div class="run-row ' + (r.long ? 'long' : '') + '"><span class="run-day">' + r.day + '</span><span class="run-dist">' + r.dist + '</span><span class="run-notes">' + (r.notes || '') + '</span></div>'; }).join('') + '</div></div></div></div>';
      card.querySelector('.week-card-header').addEventListener('click', function() { card.classList.toggle('open'); });
      grid.appendChild(card);
    });
  </script>
</body>
</html>`;
}
