/**
 * Sample previews for the home page tool cards. They never show a real runner's data:
 * the plan is the sample plan the card links to, and the week is the demo week from weekly-data.
 */
import type { ReactNode } from 'react';
import { DEMO_WEEKS, type WeeklySessionWeek } from '@/lib/weekly-data';

const ORANGE = '#e85d04';
const BLUE = '#3987e5';
const SURFACE = '#141414';
const INK = '#f5f5f5';
const MUTED = '#a3a3a3';
const DISPLAY_FONT = "'Bebas Neue', sans-serif";
const BASELINE = '1px solid rgba(255,255,255,0.14)';
const PLOT_HEIGHT = 112;
const LABEL_SPACE = 20;
const KM_TO_MI = 0.621371;
const M_TO_FT = 3.28084;

const smallText = { fontSize: '0.72rem', color: MUTED, fontVariantNumeric: 'lining-nums' } as const;

type Stat = { label: string; value: string; unit?: string };
type Bar = { id: string; value: number; label?: string; tick?: string; strong?: boolean };

function Panel({
  color,
  glow,
  summary,
  kicker,
  value,
  unit,
  note,
  chart,
  stats,
}: {
  color: string;
  glow: string;
  summary: string;
  kicker: string;
  value: string;
  unit: string;
  note: string;
  chart: ReactNode;
  stats: Stat[];
}) {
  return (
    <div
      role="img"
      aria-label={summary}
      style={{
        padding: '20px 22px 22px',
        background: `radial-gradient(120% 80% at 50% 115%, ${glow} 0%, transparent 65%), ${SURFACE}`,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <p style={{ ...smallText, margin: 0, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{kicker}</p>
      <p
        style={{
          margin: '10px 0 0',
          fontFamily: DISPLAY_FONT,
          fontSize: '3.25rem',
          lineHeight: 1,
          letterSpacing: '0.01em',
          color: INK,
        }}
      >
        {value} <span style={{ fontSize: '1.5rem', color }}>{unit}</span>
      </p>
      <p style={{ ...smallText, margin: '4px 0 14px', fontSize: '0.82rem' }}>{note}</p>
      {chart}
      <dl
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 12,
          margin: '18px 0 0',
        }}
      >
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt style={{ ...smallText, whiteSpace: 'nowrap' }}>{stat.label}</dt>
            <dd
              style={{
                margin: '2px 0 0',
                fontFamily: DISPLAY_FONT,
                fontSize: '1.5rem',
                lineHeight: 1.1,
                color: INK,
                whiteSpace: 'nowrap',
              }}
            >
              {stat.value}
              {stat.unit && <span style={{ fontSize: '0.95rem', color: MUTED }}> {stat.unit}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Bars({ bars, color }: { bars: Bar[]; color: string }) {
  const max = Math.max(...bars.map((bar) => bar.value));
  const row = { display: 'flex', justifyContent: 'space-between', gap: 4 } as const;
  const column = { flex: '1 1 0', minWidth: 0, maxWidth: 28, display: 'flex' } as const;
  return (
    <div>
      <div style={{ ...row, alignItems: 'flex-end', height: PLOT_HEIGHT + LABEL_SPACE, borderBottom: BASELINE }}>
        {bars.map((bar) => (
          <div key={bar.id} style={{ ...column, flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {bar.label && <span style={{ ...smallText, color: INK, whiteSpace: 'nowrap' }}>{bar.label}</span>}
            <div
              style={{
                width: '100%',
                height: Math.max(3, (bar.value / max) * PLOT_HEIGHT),
                borderRadius: '4px 4px 0 0',
                background: color,
                opacity: bar.strong ? 1 : 0.5,
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ ...row, marginTop: 6 }}>
        {bars.map((bar) => (
          <div key={bar.id} style={{ ...column, justifyContent: 'center' }}>
            <span style={{ ...smallText, whiteSpace: 'nowrap' }}>{bar.tick}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendLine({ values, unit, color, ticks }: { values: number[]; unit: string; color: string; ticks: [string, string] }) {
  const min = Math.min(...values);
  const span = Math.max(...values) - min;
  const points = values.map((value, i) => ({
    x: 2 + (i / (values.length - 1)) * 95,
    y: 76 - ((value - min) / span) * 54,
  }));
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const first = points[0];
  const last = points[points.length - 1];
  const valueLabel = { ...smallText, position: 'absolute', color: INK, whiteSpace: 'nowrap' } as const;
  return (
    <div>
      <div style={{ position: 'relative', height: PLOT_HEIGHT + LABEL_SPACE, borderBottom: BASELINE }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="tool-card-trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line} L${last.x},100 L${first.x},100 Z`} fill="url(#tool-card-trend-fill)" />
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span
          style={{
            position: 'absolute',
            left: `${last.x}%`,
            top: `${last.y}%`,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 0 2px ${SURFACE}`,
            transform: 'translate(-50%, -50%)',
          }}
        />
        <span style={{ ...valueLabel, left: 0, top: `calc(${first.y}% - 22px)` }}>
          {values[0]} {unit}
        </span>
        <span style={{ ...valueLabel, right: 0, top: `calc(${last.y}% - 26px)` }}>
          {values[values.length - 1]} {unit}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        {ticks.map((tick) => (
          <span key={tick} style={smallText}>
            {tick}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Long runs from public/training-plan.html, ending with the 50K. */
const SAMPLE_LONG_RUNS = [6, 8, 10, 11, 12, 14, 16, 18, 14, 8];
const SAMPLE_RACE_MILES = 31;

export function PlanVisual() {
  const longest = Math.max(...SAMPLE_LONG_RUNS);
  const bars: Bar[] = [
    ...SAMPLE_LONG_RUNS.map((miles, i) => ({
      id: `week-${i + 1}`,
      value: miles,
      label: miles === longest ? String(miles) : undefined,
      tick: i === 0 ? 'Wk 1' : undefined,
    })),
    { id: 'race', value: SAMPLE_RACE_MILES, label: '50K', tick: 'Race', strong: true },
  ];
  return (
    <Panel
      color={ORANGE}
      glow="rgba(232, 93, 4, 0.2)"
      summary="Sample 50K plan: long runs build over 11 weeks from 6 to 18 miles, then taper for two weeks before race day."
      kicker="Sample plan"
      value={String(bars.length)}
      unit="weeks"
      note="Long runs building to a 50K"
      chart={<Bars bars={bars} color={ORANGE} />}
      stats={[
        { label: 'Peak week', value: '28', unit: 'mi' },
        { label: 'Longest', value: String(longest), unit: 'mi' },
        { label: 'Taper', value: '2', unit: 'wks' },
      ]}
    />
  );
}

function weekTotal(week: WeeklySessionWeek, key: 'dist' | 'time' | 'elev'): number {
  return week.sessions.reduce((total, session) => total + session[key], 0);
}

export function WeekVisual() {
  const week = DEMO_WEEKS[DEMO_WEEKS.length - 1];
  const previous = DEMO_WEEKS[DEMO_WEEKS.length - 2];
  const miles = weekTotal(week, 'dist') * KM_TO_MI;
  const seconds = weekTotal(week, 'time');
  const drop = Math.round((1 - weekTotal(week, 'dist') / weekTotal(previous, 'dist')) * 100);
  const pace = seconds / miles;
  const longest = Math.max(...week.sessions.map((session) => session.dist));
  const bars: Bar[] = week.sessions.map((session) => ({
    id: session.day,
    value: session.dist * KM_TO_MI,
    label: session.dist === longest ? (session.dist * KM_TO_MI).toFixed(1) : undefined,
    tick: session.day,
    strong: session.dist === longest,
  }));
  return (
    <Panel
      color={ORANGE}
      glow="rgba(232, 93, 4, 0.2)"
      summary={`Sample week: ${miles.toFixed(1)} miles, down ${drop}% from the week before, with the longest run on Saturday.`}
      kicker="Sample week"
      value={miles.toFixed(1)}
      unit="mi"
      note={`▼ ${drop}% vs last week`}
      chart={<Bars bars={bars} color={ORANGE} />}
      stats={[
        { label: 'Avg pace', value: `${Math.floor(pace / 60)}:${String(Math.round(pace % 60)).padStart(2, '0')}`, unit: '/mi' },
        { label: 'Time', value: `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m` },
        { label: 'Elevation', value: Math.round(weekTotal(week, 'elev') * M_TO_FT).toLocaleString('en-US'), unit: 'ft' },
      ]}
    />
  );
}

/** Made up for the preview, not a real runner's data. */
const SAMPLE_GROUND_CONTACT = [262, 260, 261, 258, 256, 257, 254, 252, 251, 249, 248, 246];

export function FormVisual() {
  const first = SAMPLE_GROUND_CONTACT[0];
  const latest = SAMPLE_GROUND_CONTACT[SAMPLE_GROUND_CONTACT.length - 1];
  const drop = Math.round((1 - latest / first) * 100);
  return (
    <Panel
      color={BLUE}
      glow="rgba(57, 135, 229, 0.18)"
      summary={`Sample data: ground contact time at the same pace falls from ${first} to ${latest} milliseconds over 12 weeks.`}
      kicker="Sample data"
      value={String(latest)}
      unit="ms"
      note={`Ground contact at 9:00/mi, ▼ ${drop}% in 12 weeks`}
      chart={<TrendLine values={SAMPLE_GROUND_CONTACT} unit="ms" color={BLUE} ticks={['12 weeks ago', 'Now']} />}
      stats={[
        { label: 'Cadence', value: '172', unit: 'spm' },
        { label: 'Stride', value: '1.04', unit: 'm' },
        { label: 'Vert. ratio', value: '7.9', unit: '%' },
      ]}
    />
  );
}
