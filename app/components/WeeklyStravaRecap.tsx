'use client';

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { WeeklySessionWeek } from '@/lib/weekly-session';
import {
  CONTROLS,
  DEFAULT_SKIN_ID,
  GLASS_WHITE,
  SKIN_FONT_HREF,
  SKIN_PREVIEW_STORAGE_KEY,
  SKINS,
  controlStyle,
  getSkin,
  isSkinId,
  type SkinId,
} from '@/lib/weekly-skins';

const KM_TO_MI = 0.621371;

function clock(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}m`;
}

function paceStr(secPerUnit: number) {
  if (!isFinite(secPerUnit) || secPerUnit <= 0) return '—';
  const m = Math.floor(secPerUnit / 60);
  const s = Math.round(secPerUnit % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type Session = WeeklySessionWeek['sessions'][number];

function PaceLine({ runs, unit }: { runs: Session[]; unit: 'km' | 'mi' }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 416;
  const H = 84;
  const padX = 10;
  const padY = 16;

  const conv = (km: number) => (unit === 'km' ? km : km * KM_TO_MI);
  const paces = runs.map((r) => r.time / conv(r.dist));
  const min = Math.min(...paces);
  const max = Math.max(...paces);
  const span = Math.max(1, max - min);

  if (runs.length === 0) {
    return (
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', margin: 0 }}>
        No runs this week
      </p>
    );
  }

  const pts = paces.map((p, i) => {
    const x =
      runs.length === 1 ? W / 2 : padX + (i / (paces.length - 1)) * (W - padX * 2);
    const y = padY + ((p - min) / span) * (H - padY * 2);
    return { x, y };
  });

  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${path} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`;

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', overflow: 'visible', display: 'block' }}>
        <defs>
          <linearGradient id="weeklyPaceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--pace)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--pace)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#weeklyPaceFill)" />
        <path
          d={path}
          fill="none"
          stroke="var(--pace)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p, i) => {
          const active = hover === i;
          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={active ? 6 : 4.5}
                fill={active ? 'var(--pace)' : 'var(--tile)'}
                stroke="var(--pace)"
                strokeWidth="2"
              />
              <rect
                x={p.x - 18}
                y={0}
                width={36}
                height={H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
              {active && (
                <text
                  x={p.x}
                  y={p.y - 12}
                  textAnchor="middle"
                  fill="var(--ink)"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700 }}
                >
                  {paceStr(paces[i])}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
        {runs.map((r, i) => (
          <span
            key={`${r.day}-${i}`}
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: hover === i ? 'var(--ink)' : 'var(--muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {r.day}
          </span>
        ))}
      </div>
    </div>
  );
}

export type WeeklyStravaRecapProps = {
  weeks: WeeklySessionWeek[];
  athleteName: string;
  initials: string;
  username?: string;
  connected: boolean;
  connecting?: boolean;
  onConnect: () => void;
  /** Weekly session id — required to persist a theme after connect. */
  sessionId?: string | null;
  /** Saved theme from the server (after connect). */
  savedSkinId?: SkinId | null;
  /** Optional chrome above the card (e.g. section title on landing). */
  headerExtra?: ReactNode;
  compact?: boolean;
};

export default function WeeklyStravaRecap({
  weeks,
  athleteName,
  initials,
  username,
  connected,
  connecting,
  onConnect,
  sessionId,
  savedSkinId = null,
  headerExtra,
  compact,
}: WeeklyStravaRecapProps) {
  const [unit, setUnit] = useState<'km' | 'mi'>('mi');
  const [hover, setHover] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [weekIndex, setWeekIndex] = useState(() => Math.max(0, weeks.length - 1));
  const [glassInk, setGlassInk] = useState<'dark' | 'light'>('dark');
  const [previewSkinId, setPreviewSkinId] = useState<SkinId>(() =>
    savedSkinId && isSkinId(savedSkinId) ? savedSkinId : DEFAULT_SKIN_ID
  );
  const [selectedSkinId, setSelectedSkinId] = useState<SkinId | null>(
    savedSkinId && isSkinId(savedSkinId) ? savedSkinId : null
  );
  const [savingTheme, setSavingTheme] = useState(false);
  const [themeMessage, setThemeMessage] = useState<string | null>(null);

  // Keep selection on the newest week when data reloads after Strava connect.
  useEffect(() => {
    setWeekIndex(Math.max(0, weeks.length - 1));
    setHover(null);
  }, [weeks]);

  useEffect(() => {
    if (savedSkinId && isSkinId(savedSkinId)) {
      setSelectedSkinId(savedSkinId);
      setPreviewSkinId(savedSkinId);
      return;
    }
    try {
      const stored = sessionStorage.getItem(SKIN_PREVIEW_STORAGE_KEY);
      if (isSkinId(stored)) setPreviewSkinId(stored);
    } catch {
      /* ignore */
    }
  }, [savedSkinId]);

  useEffect(() => {
    try {
      sessionStorage.setItem(SKIN_PREVIEW_STORAGE_KEY, previewSkinId);
    } catch {
      /* ignore */
    }
  }, [previewSkinId]);

  const skin = getSkin(previewSkinId);
  const sharp = previewSkinId === 'glamor';
  const swapBars = previewSkinId === 'mtv' || previewSkinId === 'chromepop';
  const ctl = (i: number) => controlStyle(previewSkinId, i);
  const themeDirty = connected && previewSkinId !== selectedSkinId;
  const themeSaved = connected && selectedSkinId === previewSkinId && selectedSkinId != null;

  const previewTheme = (id: SkinId) => {
    setPreviewSkinId(id);
    setThemeMessage(null);
  };

  const selectTheme = async () => {
    if (!connected || !sessionId) return;
    setSavingTheme(true);
    setThemeMessage(null);
    try {
      const res = await fetch(`/api/weekly/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skinId: previewSkinId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setThemeMessage(json.error || 'Could not save theme.');
        return;
      }
      setSelectedSkinId(previewSkinId);
      setThemeMessage(`Saved ${skin.label}`);
    } catch {
      setThemeMessage('Could not save theme.');
    } finally {
      setSavingTheme(false);
    }
  };

  const safeIndex = Math.min(weekIndex, Math.max(0, weeks.length - 1));
  const WEEK = weeks[safeIndex]?.sessions ?? [];
  const LAST_WEEK_KM =
    safeIndex > 0 ? weeks[safeIndex - 1].sessions.reduce((a, r) => a + r.dist, 0) : 0;

  const conv = (km: number) => (unit === 'km' ? km : km * KM_TO_MI);

  const totals = useMemo(() => {
    const sessions = weeks[safeIndex]?.sessions ?? [];
    const dist = sessions.reduce((a, r) => a + r.dist, 0);
    const time = sessions.reduce((a, r) => a + r.time, 0);
    const elev = sessions.reduce((a, r) => a + r.elev, 0);
    const runs = sessions.filter((r) => r.dist > 0).length;
    return { dist, time, elev, runs };
  }, [weeks, safeIndex]);

  const maxDist = Math.max(...WEEK.map((r) => r.dist), 0.0001);
  const avgPaceSec = totals.dist > 0 ? totals.time / conv(totals.dist) : 0;
  const deltaPct = LAST_WEEK_KM > 0 ? ((totals.dist - LAST_WEEK_KM) / LAST_WEEK_KM) * 100 : 0;
  const up = deltaPct >= 0;
  const runsOnly = WEEK.filter((r) => r.dist > 0);

  const copy = () => {
    navigator.clipboard
      ?.writeText(typeof window !== 'undefined' ? window.location.href : '')
      .catch(() => {})
      .finally(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      });
  };

  const stats = [
    { label: 'Moving time', value: clock(totals.time), sub: `across ${totals.runs} runs` },
    { label: 'Avg pace', value: paceStr(avgPaceSec), sub: `min / ${unit}` },
    { label: 'Elevation', value: Math.round(totals.elev).toLocaleString(), sub: 'm gained' },
    {
      label: 'Longest',
      value: conv(maxDist === 0.0001 ? 0 : Math.max(...WEEK.map((r) => r.dist))).toFixed(1),
      sub: `${unit} · long run`,
    },
  ];

  const rootStyle: CSSProperties = {
    ...(skin.vars as CSSProperties),
    ...(previewSkinId === 'glass' && glassInk === 'light' ? (GLASS_WHITE as CSSProperties) : {}),
    background: 'var(--page-bg)',
    position: 'relative',
    width: '100%',
    padding: compact ? '24px 16px 40px' : '32px 16px 48px',
    boxSizing: 'border-box',
  };

  const isLightPage =
    previewSkinId === 'confetti' ||
    previewSkinId === 'glamor' ||
    previewSkinId === 'americana' ||
    (previewSkinId === 'glass' && glassInk === 'dark');

  return (
    <div style={rootStyle}>
      <style>{`
        @import url('${SKIN_FONT_HREF}');
        @keyframes weeklyFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes weeklySpinSlow {
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .weekly-connect-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
        .weekly-connect-btn:active { transform: translateY(0); }
        .weekly-bar-btn { background: none; border: none; padding: 0; cursor: default; }
        .weekly-skin-chip:hover { opacity: 1 !important; }
      `}</style>

      <div
        aria-hidden
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: 0,
          background: 'var(--page-glow)',
        }}
      />
      {previewSkinId === 'psychedelic' && (
        <>
          <div
            aria-hidden
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              left: '50%',
              top: '40%',
              zIndex: 0,
              width: '150vmax',
              height: '150vmax',
              transform: 'translate(-50%, -50%)',
              opacity: 0.55,
              filter: 'blur(24px)',
              background:
                'repeating-radial-gradient(circle at 50% 45%,#e4322b 0,#f7941d 7%,#ffd23f 14%,#2bb673 21%,#2e6fdb 28%,#7b3fa0 35%,#e4322b 42%)',
              animation: 'weeklySpinSlow 40s linear infinite',
            }}
          />
          <div
            aria-hidden
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              background: 'radial-gradient(60% 50% at 50% 40%, transparent, rgba(10,0,18,0.72) 75%)',
            }}
          />
        </>
      )}

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 520,
          margin: '0 auto',
          animation: 'weeklyFadeUp 0.55s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            {headerExtra}
            {!headerExtra && (
              <>
                <p
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                  }}
                >
                  Weekly Strava summary
                </p>
                <h2
                  style={{
                    margin: '6px 0 0',
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.5rem, 4vw, 1.85rem)',
                    fontWeight: 800,
                    color: 'var(--ink)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Your week at a glance
                </h2>
              </>
            )}
          </div>

          {!connected ? (
            <button
              type="button"
              className="weekly-connect-btn"
              onClick={onConnect}
              disabled={connecting}
              style={{
                flexShrink: 0,
                padding: '12px 18px',
                fontFamily: 'var(--font-display)',
                fontSize: 13,
                fontWeight: 700,
                background: 'var(--btn)',
                color: 'var(--btn-fg)',
                border: 'none',
                cursor: connecting ? 'wait' : 'pointer',
                filter: 'drop-shadow(0 5px 10px var(--btn-shadow))',
                transition: 'transform 0.15s ease, filter 0.15s ease',
                opacity: connecting ? 0.7 : 1,
                ...ctl(0),
              }}
            >
              {connecting ? 'Connecting…' : 'Connect to My Strava'}
            </button>
          ) : (
            <span
              style={{
                flexShrink: 0,
                padding: '10px 14px',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                background: 'var(--chip-bg)',
                color: 'var(--up)',
                ...ctl(1),
              }}
            >
              Connected
            </span>
          )}
        </div>

        {/* Theme preview picker */}
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 10,
              flexWrap: 'wrap',
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              {connected ? 'Choose your theme' : 'Preview themes'}
            </p>
            {connected ? (
              <button
                type="button"
                onClick={selectTheme}
                disabled={!themeDirty || savingTheme}
                style={{
                  padding: '8px 14px',
                  fontFamily: 'var(--font-display)',
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  cursor: themeDirty && !savingTheme ? 'pointer' : 'default',
                  background: themeDirty ? 'var(--btn)' : 'rgba(127,127,127,0.18)',
                  color: themeDirty ? 'var(--btn-fg)' : 'var(--muted)',
                  filter: themeDirty ? 'drop-shadow(0 4px 8px var(--btn-shadow))' : 'none',
                  opacity: savingTheme ? 0.7 : 1,
                  ...ctl(0),
                }}
              >
                {savingTheme
                  ? 'Saving…'
                  : themeSaved
                    ? `${skin.label} selected ✓`
                    : `Select ${skin.label}`}
              </button>
            ) : (
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  color: 'var(--ink-2)',
                }}
              >
                Connect Strava to lock in a theme
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            {SKINS.map((s, idx) => {
              const on = s.id === previewSkinId;
              const isSaved = selectedSkinId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  className="weekly-skin-chip"
                  onClick={() => previewTheme(s.id)}
                  title={connected ? `Preview ${s.label}` : `Preview ${s.label} (save after connect)`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px 8px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    border: on ? '1px solid var(--accent)' : '1px solid transparent',
                    cursor: 'pointer',
                    background: isLightPage
                      ? on
                        ? 'rgba(0,0,0,0.1)'
                        : 'rgba(0,0,0,0.04)'
                      : on
                        ? 'rgba(255,255,255,0.12)'
                        : 'rgba(255,255,255,0.04)',
                    color: isLightPage
                      ? on
                        ? '#0a0a0a'
                        : 'rgba(0,0,0,0.55)'
                      : on
                        ? '#fff'
                        : 'rgba(255,255,255,0.55)',
                    opacity: on ? 1 : 0.85,
                    fontFamily: 'Inter, system-ui, sans-serif',
                    position: 'relative',
                    ...controlStyle(previewSkinId, idx),
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 999,
                      background: s.swatch,
                      boxShadow: on
                        ? `0 0 0 2px ${isLightPage ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.4)'}`
                        : 'none',
                      flexShrink: 0,
                    }}
                  />
                  {s.label}
                  {isSaved && (
                    <span
                      style={{
                        fontSize: 9,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        opacity: 0.8,
                      }}
                    >
                      · saved
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {previewSkinId === 'glass' && (
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setGlassInk((v) => (v === 'dark' ? 'light' : 'dark'))}
                style={{
                  padding: '8px 14px',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  border: 'none',
                  cursor: 'pointer',
                  background: glassInk === 'dark' ? '#1a1a1a' : '#f0f0f0',
                  color: glassInk === 'dark' ? '#fff' : '#0a0a0a',
                  borderRadius: CONTROLS.glass.radius,
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {glassInk === 'dark' ? '◐ Dark text' : '◑ Light text'}
              </button>
            </div>
          )}

          {themeMessage && (
            <p
              style={{
                margin: '10px 0 0',
                textAlign: 'center',
                fontSize: 12,
                color: themeMessage.startsWith('Saved') ? 'var(--up)' : 'var(--down)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {themeMessage}
            </p>
          )}
        </div>

        {!connected && (
          <p
            style={{
              margin: '0 0 16px',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--ink-2)',
              lineHeight: 1.45,
            }}
          >
            Preview themes with sample data. Connect Strava to load your runs, then select the theme you want to keep.
          </p>
        )}

        <article
          style={{
            position: 'relative',
            width: '100%',
            overflow: 'hidden',
            borderRadius: 'var(--radius)',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: previewSkinId === 'glass' ? 'none' : '0 40px 80px -30px rgba(0,0,0,0.9)',
          }}
        >
          <div style={{ height: 3, width: '100%', background: 'var(--strip)' }} />

          <div style={{ position: 'relative', padding: '24px 28px 28px' }}>
            <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 15,
                    fontWeight: 800,
                    background: 'var(--tile)',
                    border: '1.5px solid var(--accent)',
                    color: 'var(--ink)',
                    borderRadius: sharp ? 0 : 9999,
                    fontFamily: 'var(--font-display)',
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>
                <div style={{ lineHeight: 1.2, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 15,
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                      fontFamily: 'var(--font-display)',
                      color: 'var(--ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {athleteName}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setWeekIndex((i) => Math.max(0, i - 1));
                        setHover(null);
                      }}
                      disabled={safeIndex === 0 || weeks.length === 0}
                      aria-label="Previous week"
                      style={{
                        width: 20,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--muted)',
                        cursor: safeIndex === 0 ? 'default' : 'pointer',
                        opacity: safeIndex === 0 ? 0.25 : 1,
                        fontSize: 16,
                        padding: 0,
                      }}
                    >
                      ‹
                    </button>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.14em',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--muted)',
                      }}
                    >
                      {weeks[safeIndex]?.range ?? 'No weeks yet'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setWeekIndex((i) => Math.min(weeks.length - 1, i + 1));
                        setHover(null);
                      }}
                      disabled={safeIndex >= weeks.length - 1 || weeks.length === 0}
                      aria-label="Next week"
                      style={{
                        width: 20,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--muted)',
                        cursor: safeIndex >= weeks.length - 1 ? 'default' : 'pointer',
                        opacity: safeIndex >= weeks.length - 1 ? 0.25 : 1,
                        fontSize: 16,
                        padding: 0,
                      }}
                    >
                      ›
                    </button>
                  </div>
                </div>
              </div>

              <span
                style={{
                  padding: '6px 12px',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.16em',
                  background: 'var(--chip-bg)',
                  color: 'var(--accent-hi)',
                  fontFamily: 'var(--font-mono)',
                  whiteSpace: 'nowrap',
                  ...ctl(1),
                }}
              >
                Weekly Recap
              </span>
            </header>

            <div style={{ marginTop: 28 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--muted)',
                }}
              >
                Total distance
              </p>
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontWeight: 900,
                    lineHeight: 0.85,
                    letterSpacing: '-0.03em',
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: 'clamp(52px, 14vw, 82px)',
                    color: 'var(--ink)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {conv(totals.dist).toFixed(1)}
                </span>
                <span
                  style={{
                    marginBottom: 10,
                    fontSize: 24,
                    fontWeight: 700,
                    color: 'var(--ink-2)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {unit}
                </span>
                {LAST_WEEK_KM > 0 && (
                  <span
                    title="vs. last week"
                    style={{
                      marginBottom: 12,
                      marginLeft: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 700,
                      color: up ? 'var(--up)' : 'var(--down)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {up ? '▲' : '▼'} {Math.abs(deltaPct).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>

            <section style={{ marginTop: 28 }}>
              <div
                style={{
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.2em',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--muted)',
                  }}
                >
                  Daily distance
                </p>
                {hover !== null && WEEK[hover]?.dist > 0 && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--ink-2)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ color: 'var(--accent-hi)' }}>{WEEK[hover].type}</span>
                    {'  ·  '}
                    {paceStr(WEEK[hover].time / conv(WEEK[hover].dist))} /{unit}
                    {'  ·  '}
                    {clock(WEEK[hover].time)}
                  </p>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  height: 168,
                  alignItems: 'flex-end',
                  gap: 8,
                  borderBottom: '1px solid var(--grid)',
                }}
              >
                {WEEK.map((r, i) => {
                  const active = hover === i;
                  const h = r.dist > 0 ? Math.max(6, (r.dist / maxDist) * 150) : 0;
                  const useActiveBar = swapBars ? !active : active;
                  return (
                    <button
                      key={r.day}
                      type="button"
                      className="weekly-bar-btn"
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(i)}
                      onBlur={() => setHover(null)}
                      style={{
                        position: 'relative',
                        flex: 1,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        outline: 'none',
                      }}
                    >
                      <span
                        style={{
                          marginBottom: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                          color: active ? 'var(--ink)' : 'var(--ink-2)',
                          opacity: r.dist > 0 && (active || hover === null) ? 1 : 0,
                          fontFamily: 'var(--font-mono)',
                          transition: 'opacity 0.15s',
                        }}
                      >
                        {r.dist > 0 ? conv(r.dist).toFixed(1) : ''}
                      </span>
                      {r.dist > 0 ? (
                        <div
                          style={{
                            width: '100%',
                            height: h,
                            background: useActiveBar ? 'var(--bar-active)' : 'var(--bar)',
                            boxShadow: active ? '0 0 18px var(--bar-glow)' : 'none',
                            borderTopLeftRadius: sharp ? 0 : 5,
                            borderTopRightRadius: sharp ? 0 : 5,
                            transition: 'all 0.2s',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            marginBottom: 1,
                            height: 3,
                            width: '100%',
                            borderRadius: sharp ? 0 : 999,
                            background: 'var(--grid)',
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                {WEEK.map((r, i) => (
                  <span
                    key={r.day}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: hover === i ? 'var(--ink)' : 'var(--muted)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {r.day}
                  </span>
                ))}
              </div>
            </section>

            <section
              style={{
                marginTop: 24,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                overflow: 'hidden',
                border: '1px solid var(--border)',
                background: 'var(--tile)',
                borderRadius: sharp ? 0 : 16,
              }}
            >
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  style={{
                    padding: '14px 16px',
                    borderRight: i % 2 === 0 ? '1px solid var(--border)' : 'none',
                    borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.16em',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--muted)',
                    }}
                  >
                    {s.label}
                  </p>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 26,
                      fontWeight: 800,
                      lineHeight: 1,
                      fontVariantNumeric: 'tabular-nums',
                      color: 'var(--ink)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {s.value}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--ink-2)' }}>{s.sub}</p>
                </div>
              ))}
            </section>

            <section style={{ marginTop: 24 }}>
              <p
                style={{
                  margin: '0 0 8px',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--muted)',
                }}
              >
                Pace per run · min/{unit}
              </p>
              <PaceLine runs={runsOnly} unit={unit} />
            </section>

            <footer
              style={{
                marginTop: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                borderTop: '1px solid var(--border)',
                paddingTop: 20,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {(['km', 'mi'] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    style={{
                      padding: '6px 14px',
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      border: 'none',
                      cursor: 'pointer',
                      background: unit === u ? 'var(--accent)' : 'rgba(127,127,127,0.14)',
                      color: unit === u ? 'var(--btn-fg)' : 'var(--ink-2)',
                      fontFamily: 'var(--font-mono)',
                      ...ctl(u === 'km' ? 0 : 1),
                    }}
                  >
                    {u}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={copy}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: 'var(--btn)',
                  color: 'var(--btn-fg)',
                  filter: 'drop-shadow(0 5px 10px var(--btn-shadow))',
                  fontFamily: 'var(--font-display)',
                  ...ctl(0),
                }}
              >
                {copied ? 'Link copied ✓' : 'Share recap'}
              </button>
            </footer>

            <p
              style={{
                margin: '16px 0 0',
                textAlign: 'center',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.22em',
                fontFamily: 'var(--font-mono)',
                color: 'var(--muted)',
              }}
            >
              {connected
                ? `Powered by Strava${username ? ` · @${username}` : ''}`
                : 'Sample preview · Connect Strava for your data'}
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
