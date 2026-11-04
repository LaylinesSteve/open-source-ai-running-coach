'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import FormChat from './FormChat';
import {
  FORM_METRICS,
  fadeChange,
  paceBands,
  paceLabel,
  recentChange,
  weeklyTrend,
  weeksBetween,
  type FormChatMessage,
  type FormReview,
  type RunForm,
  type TrendPoint,
} from '@/lib/form-trends';
import TrendChart from './TrendChart';

const RANGES = [
  { label: '6 months', days: 182 },
  { label: '3 months', days: 91 },
  { label: '6 weeks', days: 42 },
];
const REVIEW_HEADINGS = ['What changed', 'What held up', 'What to work on', 'How sure this is'];
const LONG_RUN_MINUTES = 60;

const card: CSSProperties = {
  background: '#141414',
  border: '1px solid #262626',
  borderRadius: 8,
  padding: '1rem',
};
const heading: CSSProperties = {
  fontFamily: '"Bebas Neue", sans-serif',
  fontSize: '1.35rem',
  letterSpacing: '0.02em',
  margin: '2.5rem 0 0.5rem',
};
const muted: CSSProperties = { color: '#a3a3a3', fontSize: '0.9rem', margin: 0 };
const button: CSSProperties = {
  padding: '0.6rem 1rem',
  borderRadius: 8,
  border: 'none',
  background: '#f5f5f5',
  color: '#0a0a0a',
  fontWeight: 600,
  fontSize: '0.95rem',
  fontFamily: 'inherit',
  cursor: 'pointer',
};
const secondaryButton: CSSProperties = {
  ...button,
  background: 'transparent',
  border: '1px solid #525252',
  color: '#f5f5f5',
};
const control: CSSProperties = {
  padding: '0.5rem 0.6rem',
  borderRadius: 8,
  border: '1px solid #262626',
  background: '#141414',
  color: '#f5f5f5',
  fontSize: '0.9rem',
  fontFamily: 'inherit',
};
/** The pace filter decides what every chart below means, so it wears the chart color and stands out. */
const paceControl: CSSProperties = {
  ...control,
  border: '2px solid #3987e5',
  background: '#122031',
  fontWeight: 600,
};
const cell: CSSProperties = {
  padding: '0.45rem 0.6rem',
  textAlign: 'right',
  fontVariantNumeric: 'lining-nums tabular-nums',
  whiteSpace: 'nowrap',
};
const headCell: CSSProperties = { ...cell, color: '#a3a3a3', fontWeight: 600 };

function shiftDate(date: string, days: number): string {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

function shortDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function signed(value: number, decimals: number): string {
  const text = value.toFixed(decimals);
  return value > 0 ? `+${text}` : text;
}

export default function RunningFormClient({
  initialRuns,
  initialReview,
  initialUpdatedAt,
  initialChat,
  today,
  linkPath,
}: {
  initialRuns: RunForm[];
  initialReview?: FormReview;
  initialUpdatedAt?: string;
  initialChat: FormChatMessage[];
  today: string;
  linkPath: string;
}) {
  const [runs, setRuns] = useState(initialRuns);
  const [review, setReview] = useState(initialReview);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [days, setDays] = useState(RANGES[0].days);
  const [chosenBand, setChosenBand] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [linkNote, setLinkNote] = useState('');

  const from = shiftDate(today, -days + 1);
  const inRange = useMemo(() => runs.filter((run) => run.date >= from), [runs, from]);
  const bands = useMemo(() => paceBands(inRange), [inRange]);

  // Form changes with pace, so the default compares runs at the pace you spend the most time at.
  const defaultBand = bands[0] ? String(bands[0].band) : 'all';
  const bandValue =
    chosenBand === 'all' || bands.some(({ band }) => String(band) === chosenBand)
      ? (chosenBand as string)
      : defaultBand;
  const band = bandValue === 'all' ? null : Number(bandValue);

  const trend = useMemo(() => weeklyTrend(inRange, band), [inRange, band]);
  const weeks = useMemo(() => weeksBetween(from, today), [from, today]);
  const ordered: TrendPoint[] = weeks.flatMap((week) => trend.get(week) ?? []);
  const shownMetrics = FORM_METRICS.filter(({ key }) => ordered.some((p) => p.metrics[key] !== undefined));
  const missingMetrics = FORM_METRICS.filter(({ key }) => !runs.some((r) => r.overall[key] !== undefined));
  const longRuns = inRange
    .filter((run) => run.fade && run.runningMinutes >= LONG_RUN_MINUTES)
    .slice(0, 10);
  const fadeMetrics = FORM_METRICS.filter(({ key }) =>
    longRuns.some((run) => fadeChange(run, key) !== undefined)
  );

  async function analyze() {
    setSyncing(true);
    setSyncNote('Finding your runs…');
    let failed = 0;
    let fresh = true;
    try {
      for (;;) {
        const res = await fetch('/api/form/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fresh }),
        });
        const data = await res.json();
        if (!res.ok) {
          setSyncNote(data.error ?? 'Could not get your runs from Garmin.');
          break;
        }
        fresh = false;
        failed += data.failed;
        setSyncNote(`Analyzed ${data.analyzed} runs, ${data.remaining} to go…`);
        if (data.runs) {
          setRuns(data.runs);
          setUpdatedAt(data.updatedAt);
          setSyncNote(
            data.rateLimited
              ? `Garmin asked us to slow down, with ${data.remaining} runs left. Try again in a while.`
              : failed > 0
                ? `Done, but ${failed} runs could not be read. They'll be tried again next time.`
                : 'Up to date.'
          );
          break;
        }
      }
    } catch {
      setSyncNote('Could not get your runs from Garmin.');
    }
    setSyncing(false);
  }

  async function getReview() {
    setReviewing(true);
    setReviewError('');
    try {
      const res = await fetch('/api/form/review', { method: 'POST' });
      const data = await res.json();
      if (res.ok) setReview(data.review);
      else setReviewError(data.error ?? 'Could not write the review. Try again.');
    } catch {
      setReviewError('Could not write the review. Try again.');
    }
    setReviewing(false);
  }

  async function share() {
    const url = new URL(linkPath, window.location.origin).href;
    const warning = 'Anyone with this link can see this page and use the chat, but not your plans.';
    try {
      // Phones get their share sheet. Computers usually don't have one, so the link is copied.
      if (navigator.share) {
        await navigator.share({ title: 'Running form', url });
        setLinkNote(warning);
      } else {
        await navigator.clipboard.writeText(url);
        setLinkNote(`Link copied. ${warning}`);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setLinkNote(`${url} ${warning}`);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#f5f5f5',
        fontFamily: "'Syne', system-ui, sans-serif",
        fontVariantNumeric: 'lining-nums',
      }}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem 4rem' }}>
        <h1
          style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: '2.25rem',
            letterSpacing: '0.02em',
            margin: '0 0 0.25rem',
          }}
        >
          Running form
        </h1>
        <p style={{ ...muted, marginBottom: '1.25rem' }}>
          How your form is changing, from the activity files your Garmin recorded in the past 6
          months. Walking and stops are left out.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          <button type="button" onClick={analyze} disabled={syncing} style={{ ...button, opacity: syncing ? 0.6 : 1 }}>
            {syncing ? 'Working…' : runs.length ? 'Check for new runs' : 'Analyze my runs'}
          </button>
          <button type="button" onClick={share} style={secondaryButton}>
            Share
          </button>
          <p role="status" style={muted}>
            {syncNote ||
              (updatedAt ? `Last updated ${shortDate(updatedAt.slice(0, 10))}` : '')}
          </p>
        </div>
        {linkNote && (
          <p role="status" style={{ ...muted, marginTop: '0.75rem', overflowWrap: 'anywhere' }}>
            {linkNote}
          </p>
        )}

        {runs.length === 0 ? (
          <div style={{ ...card, marginTop: '1.5rem' }}>
            <p style={muted}>
              No runs yet. The first time takes a few minutes, because each run&apos;s file has to
              be downloaded from Garmin. Keep this page open while it works.
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', margin: '1.5rem 0 1rem' }}>
              <label style={{ ...muted, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Range
                <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={control}>
                  {RANGES.map((range) => (
                    <option key={range.days} value={range.days}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </label>
              <label
                style={{
                  ...muted,
                  color: '#f5f5f5',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                Pace per mile
                <select value={bandValue} onChange={(e) => setChosenBand(e.target.value)} style={paceControl}>
                  {bands.map(({ band: value, minutes }) => (
                    <option key={value} value={value}>
                      {paceLabel(value)} ({Math.round(minutes)} min)
                    </option>
                  ))}
                  <option value="all">All paces</option>
                </select>
              </label>
            </div>
            <p style={{ ...muted, marginBottom: '1rem' }}>
              {band === null
                ? 'All paces mixed together, so a faster or slower month will shift these numbers.'
                : `Only the time you spent at ${paceLabel(band)} per mile, so weeks compare like with like.`}
            </p>

            {shownMetrics.length === 0 ? (
              <div style={card}>
                <p style={muted}>No running at this pace in this range.</p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
                  gap: '1rem',
                }}
              >
                {shownMetrics.map(({ key, label, unit, decimals }) => {
                  const summary = recentChange(ordered, key);
                  return (
                    <section key={key} style={card}>
                      <h2 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 0.25rem' }}>{label}</h2>
                      {summary && (
                        <p style={{ margin: '0 0 0.5rem' }}>
                          <span style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                            {summary.recent.toFixed(decimals)}
                          </span>{' '}
                          <span style={{ color: '#a3a3a3', fontSize: '0.85rem' }}>
                            {unit}
                            {summary.change !== undefined && summary.since
                              ? `, ${signed(summary.change, decimals)} since ${shortDate(summary.since)}`
                              : ''}
                          </span>
                        </p>
                      )}
                      <TrendChart
                        label={label}
                        unit={unit}
                        decimals={decimals}
                        points={weeks.map((week) => {
                          const point = trend.get(week);
                          return {
                            week,
                            value: point?.metrics[key],
                            minutes: point?.minutes ?? 0,
                            runs: point?.runs ?? 0,
                          };
                        })}
                      />
                    </section>
                  );
                })}
              </div>
            )}

            {missingMetrics.length > 0 && (
              <p style={{ ...muted, marginTop: '1rem' }}>
                Not in your activity files: {missingMetrics.map((m) => m.label.toLowerCase()).join(', ')}.
                Some of these need a compatible watch, chest strap or running pod.
              </p>
            )}

            {ordered.length > 0 && (
              <details style={{ marginTop: '1rem' }}>
                <summary style={{ ...muted, cursor: 'pointer' }}>Show the weekly numbers</summary>
                <div style={{ ...card, marginTop: '0.75rem', padding: 0, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #262626' }}>
                        <th style={{ ...headCell, textAlign: 'left' }}>Week of</th>
                        <th style={headCell}>Runs</th>
                        <th style={headCell}>Minutes</th>
                        {shownMetrics.map(({ key, label, unit }) => (
                          <th key={key} style={headCell}>
                            {label} ({unit})
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...ordered].reverse().map((point) => (
                        <tr key={point.key} style={{ borderBottom: '1px solid #262626' }}>
                          <td style={{ ...cell, textAlign: 'left' }}>{shortDate(point.key)}</td>
                          <td style={cell}>{point.runs}</td>
                          <td style={cell}>{Math.round(point.minutes)}</td>
                          {shownMetrics.map(({ key, decimals }) => (
                            <td key={key} style={cell}>
                              {point.metrics[key]?.toFixed(decimals) ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}

            {longRuns.length > 0 && (
              <>
                <h2 style={heading}>How your form holds up on long runs</h2>
                <p style={{ ...muted, marginBottom: '0.75rem' }}>
                  The last quarter of each run compared with the first quarter, at all paces.
                </p>
                <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #262626' }}>
                        <th style={{ ...headCell, textAlign: 'left' }}>Run</th>
                        <th style={headCell}>Miles</th>
                        {fadeMetrics.map(({ key, label, unit }) => (
                          <th key={key} style={headCell}>
                            {label} ({unit})
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {longRuns.map((run) => (
                        <tr key={run.id} style={{ borderBottom: '1px solid #262626' }}>
                          <td style={{ ...cell, textAlign: 'left' }}>{shortDate(run.date)}</td>
                          <td style={cell}>{run.miles.toFixed(1)}</td>
                          {fadeMetrics.map(({ key, decimals }) => {
                            const change = fadeChange(run, key);
                            return (
                              <td key={key} style={cell}>
                                {change === undefined ? '' : signed(change, decimals)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <h2 style={heading}>AI form review</h2>
            <p style={{ ...muted, marginBottom: '0.75rem' }}>
              Reviews all 6 months. This sends your form numbers to Google Gemini. It works from
              sensor averages, so it isn&apos;t a video gait analysis or medical advice.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={getReview}
                disabled={reviewing}
                style={{ ...button, opacity: reviewing ? 0.6 : 1 }}
              >
                {reviewing ? 'Writing…' : review ? 'Update the review' : 'Review my form'}
              </button>
              {review && <p style={muted}>Written {shortDate(review.at.slice(0, 10))}</p>}
            </div>
            {reviewError && (
              <p role="alert" style={{ color: '#f87171', fontSize: '0.9rem', marginTop: '0.75rem' }}>
                {reviewError}
              </p>
            )}
            {review && (
              <div style={{ ...card, marginTop: '1rem', lineHeight: 1.6 }}>
                {review.text.split('\n').map((line, index) =>
                  REVIEW_HEADINGS.includes(line.trim()) ? (
                    <h3 key={index} style={{ fontSize: '1rem', margin: '1rem 0 0.25rem' }}>
                      {line.trim()}
                    </h3>
                  ) : (
                    line.trim() && (
                      <p key={index} style={{ margin: '0 0 0.5rem', color: '#d4d4d4' }}>
                        {line}
                      </p>
                    )
                  )
                )}
              </div>
            )}

            <h2 style={heading}>Ask about your form</h2>
            <p style={{ ...muted, marginBottom: '0.75rem' }}>
              Ask about a trend, a pace or a specific run. Each question sends your form numbers to
              Google Gemini.
            </p>
            <FormChat initialMessages={initialChat} />
          </>
        )}
      </div>
    </div>
  );
}
