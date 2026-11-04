'use client';

/**
 * Sample previews for the home page tool cards. They never show a real runner's data:
 * the plan is the sample plan the card links to, and the week is the demo week from weekly-data.
 */
import dynamic from 'next/dynamic';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { DEMO_WEEKS, type WeeklySessionWeek } from '@/lib/weekly-data';
import { controlStyle, getSkin, SKIN_DECO_KEYFRAMES, SKIN_FONT_HREF, type SkinId } from '@/lib/weekly-skins';

/** Client only: browsers can round its random positions differently from the server. */
const WeeklySkinDeco = dynamic(() => import('@/app/components/WeeklySkinDeco'), { ssr: false });

const ORANGE = '#e85d04';
const BLUE = '#3987e5';
const SURFACE = '#141414';
const INK = '#f5f5f5';
const MUTED = '#a3a3a3';
const DISPLAY_FONT = "'Bebas Neue', sans-serif";
const BASELINE = '1px solid rgba(255,255,255,0.14)';
const PLOT_HEIGHT = 150;
const LABEL_SPACE = 20;
const SHARE_PLOT_HEIGHT = 104;
const SHARE_STAGE_HEIGHT = 344;
const THEME_MS = 3000;
const SHOWCASE_THEMES: SkinId[] = ['confetti', 'chromepop', 'glamor', 'mtv', 'americana', 'nps'];
const KM_TO_MI = 0.621371;

const smallText = { fontSize: '0.72rem', color: MUTED, fontVariantNumeric: 'lining-nums' } as const;

type Stat = { label: string; value: string; unit?: string };
type Bar = { id: string; value: number; label?: string; tick?: string; strong?: boolean };

function Panel({
  color,
  glow,
  summary,
  value,
  unit,
  note,
  chart,
  stats,
}: {
  color: string;
  glow: string;
  summary: string;
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
      <p
        style={{
          margin: 0,
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
      value={String(bars.length)}
      unit="weeks"
      note="Sample plan: long runs building to a 50K"
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

const WEEK = DEMO_WEEKS[DEMO_WEEKS.length - 1];
const WEEK_MILES = weekTotal(WEEK, 'dist') * KM_TO_MI;
const WEEK_DROP = Math.round((1 - weekTotal(WEEK, 'dist') / weekTotal(DEMO_WEEKS[DEMO_WEEKS.length - 2], 'dist')) * 100);
const WEEK_LONGEST_KM = Math.max(...WEEK.sessions.map((session) => session.dist));

/** One week of the weekly recap share card in a theme, without the controls. */
function ShareCard({ skinId, motion, onMotionEnd }: { skinId: SkinId; motion?: string; onMotionEnd?: () => void }) {
  const sharp = skinId === 'glamor';
  const heading = {
    margin: 0,
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: 'var(--ink-2)',
  } as const;
  const truncated = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;
  return (
    <div
      className={motion}
      onAnimationEnd={onMotionEnd}
      style={{
        ...(getSkin(skinId).vars as CSSProperties),
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        containerType: 'inline-size',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--card)',
        color: 'var(--ink)',
      }}
    >
      <div style={{ height: 4, flexShrink: 0, background: 'var(--strip)' }} />
      <WeeklySkinDeco skinId={skinId} />
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', padding: '18px 22px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span
              style={{
                width: 44,
                height: 44,
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                borderRadius: sharp ? 0 : '50%',
                border: '1.5px solid var(--accent)',
                background: 'var(--tile)',
                fontFamily: 'var(--font-display)',
                fontSize: 15,
                fontWeight: 800,
              }}
            >
              MO
            </span>
            <div style={{ minWidth: 0 }}>
              <p style={{ ...truncated, margin: 0, fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 }}>
                Maya Okonkwo
              </p>
              <p style={{ ...heading, ...truncated, marginTop: 2, fontSize: 10, letterSpacing: '0.1em' }}>
                {WEEK.range.replace(/, \d{4}$/, '')}
              </p>
            </div>
          </div>
          <span
            className="tool-theme-chip"
            style={{
              flexShrink: 0,
              padding: '6px 10px',
              background: 'var(--chip-bg)',
              color: 'var(--accent-hi)',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              ...controlStyle(skinId, 1),
            }}
          >
            Weekly recap
          </span>
        </div>

        <p style={{ ...heading, marginTop: 16 }}>Total distance</p>
        <p style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '2px 0 0', fontFamily: 'var(--font-display)' }}>
          <span style={{ fontSize: 'min(60px, 16cqw)', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}>
            {WEEK_MILES.toFixed(1)}
          </span>
          <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink-2)' }}>mi</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--down)' }}>
            ▼ {WEEK_DROP}%
          </span>
        </p>

        <div style={{ marginTop: 'auto', paddingTop: 12 }}>
          <p style={heading}>Daily distance</p>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 8,
              height: SHARE_PLOT_HEIGHT + LABEL_SPACE,
              borderBottom: '1px solid var(--grid)',
            }}
          >
            {WEEK.sessions.map((session) => (
              <div
                key={session.day}
                style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
              >
                {session.dist > 0 && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--ink-2)' }}>
                    {(session.dist * KM_TO_MI).toFixed(1)}
                  </span>
                )}
                <div
                  style={{
                    width: '100%',
                    height: session.dist > 0 ? (session.dist / WEEK_LONGEST_KM) * SHARE_PLOT_HEIGHT : 3,
                    borderRadius: sharp ? 0 : '5px 5px 0 0',
                    background:
                      session.dist === 0
                        ? 'var(--grid)'
                        : skinId === 'mtv' || skinId === 'chromepop'
                          ? 'var(--bar-active)'
                          : 'var(--bar)',
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            {WEEK.sessions.map((session) => (
              <span
                key={session.day}
                style={{
                  flex: '1 1 0',
                  textAlign: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-2)',
                }}
              >
                {session.day}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Scrolls through a mix of the themes, alternating light and dark. */
export function WeekVisual() {
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<SkinId | null>(null);
  const [playing, setPlaying] = useState(true);
  const [hovering, setHovering] = useState(false);
  const current = SHOWCASE_THEMES[index];
  const skin = getSkin(current);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing || hovering) return;
    const timer = setTimeout(() => {
      setLeaving(SHOWCASE_THEMES[index]);
      setIndex((index + 1) % SHOWCASE_THEMES.length);
    }, THEME_MS);
    return () => clearTimeout(timer);
  }, [index, playing, hovering]);

  return (
    <div
      onPointerEnter={(event) => setHovering(event.pointerType === 'mouse')}
      onPointerLeave={() => setHovering(false)}
      style={{ display: 'flex', flexDirection: 'column', background: SURFACE, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
    >
      <link rel="stylesheet" href={SKIN_FONT_HREF} precedence="default" />
      <style>{`
        ${SKIN_DECO_KEYFRAMES}
        @keyframes toolThemeIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes toolThemeOut { from { transform: translateX(0); } to { transform: translateX(-100%); } }
        .tool-theme-in { animation: toolThemeIn 0.6s cubic-bezier(0.22, 0.61, 0.36, 1) both; }
        .tool-theme-out { animation: toolThemeOut 0.6s cubic-bezier(0.22, 0.61, 0.36, 1) both; }
        @container (max-width: 340px) {
          .tool-theme-chip { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .tool-theme-stage, .tool-theme-stage * { animation: none !important; }
          .tool-theme-out { display: none; }
        }
      `}</style>
      <div
        role="img"
        aria-label={`Sample share card in the ${skin.label} theme: ${WEEK_MILES.toFixed(1)} miles this week, down ${WEEK_DROP}% from last week, with daily distance bars.`}
        className="tool-theme-stage"
        style={{ position: 'relative', flex: 1, minHeight: SHARE_STAGE_HEIGHT, overflow: 'hidden' }}
      >
        {[leaving, current].map(
          (skinId) =>
            skinId && (
              <ShareCard
                key={skinId}
                skinId={skinId}
                motion={skinId === leaving ? 'tool-theme-out' : leaving ? 'tool-theme-in' : undefined}
                onMotionEnd={skinId === leaving ? () => setLeaving(null) : undefined}
              />
            )
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '6px 12px 6px 22px' }}>
        <span style={{ ...smallText, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
          <span aria-hidden style={{ width: 12, height: 12, borderRadius: '50%', background: skin.swatch }} />
          {skin.label} theme · Sample
        </span>
        <button
          type="button"
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? 'Pause the theme preview' : 'Play the theme preview'}
          style={{ ...smallText, padding: '6px 10px', fontSize: '0.8rem', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>
    </div>
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
      value={String(latest)}
      unit="ms"
      note={`Sample: ground contact at 9:00/mi, ▼ ${drop}% in 12 weeks`}
      chart={<TrendLine values={SAMPLE_GROUND_CONTACT} unit="ms" color={BLUE} ticks={['12 weeks ago', 'Now']} />}
      stats={[
        { label: 'Cadence', value: '172', unit: 'spm' },
        { label: 'Stride', value: '1.04', unit: 'm' },
        { label: 'Vert. ratio', value: '7.9', unit: '%' },
      ]}
    />
  );
}
