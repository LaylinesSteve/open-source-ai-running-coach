'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { StrengthExercise, StrengthSession, StrengthWorkout } from '@/lib/strength';
import {
  WORK_LEAD_IN_SEC,
  carriedLoad,
  doneCount,
  emptySession,
  isSetDone,
  loadAt,
  nextUp,
  repsAt,
  sessionTotals,
  withField,
  withSetToggled,
} from '@/lib/strength';
import { clock, drawSummaryCard, elapsedSec } from './summaryImage';

const C = {
  bg: '#0a0a0a',
  card: '#141414',
  line: '#262626',
  lineStrong: '#404040',
  ink: '#f5f5f5',
  muted: '#a3a3a3',
  dim: '#737373',
  accent: '#e85d04',
  done: '#22c55e',
};
const DISPLAY = '"Bebas Neue", sans-serif';

type Timer = {
  kind: 'ready' | 'work' | 'rest';
  endsAt: number;
  total: number;
  label: string;
  /** Work countdown that follows a get-ready lead-in. */
  after?: { seconds: number; label: string };
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function localDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function backupKey(planId: string, workoutId: string, date: string): string {
  return `strength:${planId}:${workoutId}:${date}`;
}

function readBackup(key: string): StrengthSession | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StrengthSession) : null;
  } catch {
    return null;
  }
}

function writeBackup(key: string, session: StrengthSession): void {
  try {
    localStorage.setItem(key, JSON.stringify(session));
  } catch {
    // The server copy is the record; the device copy only covers a dropped connection.
  }
}

function nextLine(next: { ex: StrengthExercise; i: number }): string {
  return next.ex.name + (next.ex.sets > 1 ? `, set ${next.i + 1} of ${next.ex.sets}` : '');
}

const fieldStyle: CSSProperties = {
  width: '100%',
  height: 44,
  padding: '0 2px',
  textAlign: 'center',
  background: C.bg,
  border: `2px solid ${C.line}`,
  borderRadius: 10,
  color: C.ink,
  fontSize: 18,
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
  boxSizing: 'border-box',
};

const rowLabelStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: 44,
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: C.dim,
};

export default function StrengthTracker({
  planId,
  workout,
  sessions,
  planLabel,
}: {
  planId: string;
  workout: StrengthWorkout;
  /** Saved sessions for this workout, any date. */
  sessions: StrengthSession[];
  planLabel?: string;
}) {
  // The session is keyed by the athlete's local date, which the server can't know, so it loads after mount.
  const [session, setSession] = useState<StrengthSession | null>(null);
  const [previous, setPrevious] = useState<StrengthSession | null>(null);
  const [timer, setTimer] = useState<Timer | null>(null);
  const [now, setNow] = useState(0);
  const [flashUntil, setFlashUntil] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [retry, setRetry] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [resetArmedUntil, setResetArmedUntil] = useState(0);
  const [summaryUrl, setSummaryUrl] = useState('');
  const [summaryError, setSummaryError] = useState('');

  const dirty = useRef(false);
  const audio = useRef<AudioContext | null>(null);
  const lastTick = useRef(0);
  const wakeTried = useRef(false);

  useEffect(() => {
    const date = localDate();
    const saved = sessions.find((s) => s.date === date) ?? null;
    const backup = readBackup(backupKey(planId, workout.id, date));
    const backupIsNewer = !!backup && (!saved || (backup.updatedAt ?? '') > (saved.updatedAt ?? ''));
    setSession(backupIsNewer && backup ? backup : saved ?? emptySession(workout.id, date));
    // A device copy newer than the server's means the last save never landed. Send it again.
    if (backupIsNewer) {
      dirty.current = true;
      setRetry((n) => n + 1);
    }
    const earlier = sessions.filter((s) => s.date < date).sort((a, b) => b.date.localeCompare(a.date));
    setPrevious(earlier[0] ?? null);
    setNow(Date.now());
    // Runs once on purpose: later saves from this page must not reset what is on screen.
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  // Save shortly after the last change, so a burst of taps is one request.
  useEffect(() => {
    if (!session || !dirty.current) return;
    setSaveState('saving');
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/plan/${planId}/strength`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(session),
        });
        if (!res.ok) throw new Error('save failed');
        dirty.current = false;
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, 700);
    return () => clearTimeout(handle);
  }, [session, planId, retry]);

  // A failed save is retried on its own; the device copy holds the data meanwhile.
  useEffect(() => {
    if (saveState !== 'error') return;
    const handle = setTimeout(() => setRetry((n) => n + 1), 5000);
    return () => clearTimeout(handle);
  }, [saveState]);

  function playTone(freq: number, offsets: number[], length: number, volume: number) {
    const ctx = audio.current;
    if (!soundOn || !ctx) return;
    try {
      const t0 = ctx.currentTime;
      for (const off of offsets) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t0 + off);
        gain.gain.exponentialRampToValueAtTime(volume, t0 + off + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + off + length);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0 + off);
        osc.stop(t0 + off + length + 0.02);
      }
    } catch {
      // Sound is a convenience; the countdown on screen is the timer.
    }
  }

  // Timer transitions: get-ready rolls into work, anything else ends with a flash.
  useEffect(() => {
    if (!timer || now === 0) return;
    if (now < timer.endsAt) {
      if (timer.kind === 'ready') {
        const left = Math.ceil((timer.endsAt - now) / 1000);
        if (left <= 3 && left !== lastTick.current) {
          lastTick.current = left;
          playTone(520, [0], 0.1, 0.18);
        }
      }
      return;
    }
    playTone(880, [0, 0.24], 0.18, 0.25);
    if (timer.kind === 'ready' && timer.after) {
      setTimer({ kind: 'work', endsAt: Date.now() + timer.after.seconds * 1000, total: timer.after.seconds, label: timer.after.label });
    } else {
      setTimer(null);
      setFlashUntil(Date.now() + 1800);
    }
  }, [now, timer]);

  /** Browsers only allow audio and screen wake lock from a tap, so both are set up on the first one. */
  function onFirstTap() {
    if (soundOn && !audio.current) {
      try {
        const Ctx =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctx) audio.current = new Ctx();
      } catch {
        audio.current = null;
      }
    }
    if (!wakeTried.current) {
      wakeTried.current = true;
      try {
        const nav = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<unknown> } };
        nav.wakeLock?.request('screen').catch(() => {});
      } catch {
        // Not supported: the screen follows the device's auto-lock setting.
      }
    }
  }

  function commit(next: StrengthSession) {
    const stamped = { ...next, updatedAt: new Date().toISOString() };
    dirty.current = true;
    writeBackup(backupKey(planId, workout.id, stamped.date), stamped);
    setSession(stamped);
  }

  if (!session) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '2rem 1rem', color: C.muted }}>
        <h1 style={{ fontFamily: DISPLAY, fontSize: '2rem', letterSpacing: '0.02em', color: C.ink, margin: 0 }}>{workout.title}</h1>
        <p style={{ marginTop: 8 }}>Loading today&apos;s session…</p>
      </div>
    );
  }

  const next = nextUp(workout, session);
  const totals = sessionTotals(workout, session);
  const flashing = now < flashUntil;

  function toggle(ex: StrengthExercise, i: number) {
    if (!session) return;
    onFirstTap();
    const wasDone = isSetDone(session, ex.id, i);
    const updated = withSetToggled(workout, session, ex, i, Date.now());
    commit(updated);
    setFlashUntil(0);
    if (!wasDone && ex.restSec > 0 && nextUp(workout, updated)) {
      setTimer({ kind: 'rest', endsAt: Date.now() + ex.restSec * 1000, total: ex.restSec, label: '' });
    } else {
      setTimer(null);
    }
  }

  function startWork(ex: StrengthExercise) {
    if (!session || !ex.timedSec) return;
    onFirstTap();
    if (!session.startedAt) commit({ ...session, startedAt: Date.now() });
    lastTick.current = 0;
    setTimer({
      kind: 'ready',
      endsAt: Date.now() + WORK_LEAD_IN_SEC * 1000,
      total: WORK_LEAD_IN_SEC,
      label: `${ex.name} starts in ${WORK_LEAD_IN_SEC} sec. Pick up the weight.`,
      after: { seconds: ex.timedSec, label: `${ex.name}. Switch sides and start it again.` },
    });
  }

  function reset() {
    if (!session) return;
    if (Date.now() < resetArmedUntil) {
      setResetArmedUntil(0);
      setTimer(null);
      setSummaryUrl('');
      commit(emptySession(workout.id, session.date));
      window.scrollTo(0, 0);
    } else {
      setResetArmedUntil(Date.now() + 3000);
    }
  }

  async function makeSummary() {
    if (!session) return;
    setSummaryError('');
    try {
      const canvas = await drawSummaryCard(workout, session, planLabel ? `${planLabel} · ${workout.subtitle}` : workout.subtitle);
      setSummaryUrl(canvas.toDataURL('image/png'));
    } catch {
      setSummaryError('Could not build the image in this browser.');
    }
  }

  function renderExercise(ex: StrengthExercise, letter: string) {
    if (!session) return null;
    const complete = doneCount(session, ex) === ex.sets;
    const current = !!next && next.ex.id === ex.id;
    const hasFields = !!ex.load || ex.reps != null;
    const repsWord = ex.timedSec ? 'Sec' : 'Reps';
    const single = ex.sets === 1;
    const tags = [ex.tempo, ex.restSec ? `Rest ${ex.restSec} sec` : ''].filter(Boolean) as string[];

    const columns = Array.from({ length: ex.sets }, (_, i) => {
      const done = isSetDone(session, ex.id, i);
      const isNext = current && next?.i === i;
      const button = (
        <button
          type="button"
          onClick={() => toggle(ex, i)}
          aria-pressed={done}
          aria-label={single ? `Mark ${ex.name} done` : `${ex.name} set ${i + 1}`}
          style={{
            width: hasFields ? '100%' : undefined,
            minWidth: hasFields ? 0 : 54,
            height: 54,
            padding: hasFields ? 0 : '0 14px',
            borderRadius: 10,
            border: `2px solid ${done ? C.done : isNext ? C.accent : C.lineStrong}`,
            background: done ? C.done : isNext ? C.accent : C.bg,
            color: done ? '#052e16' : isNext ? '#fff' : C.ink,
            fontFamily: DISPLAY,
            fontSize: single && !hasFields ? 20 : 26,
            letterSpacing: '0.04em',
            cursor: 'pointer',
          }}
        >
          {done ? '✓' : single ? 'Done' : i + 1}
        </button>
      );
      if (!hasFields) return <span key={i}>{button}</span>;
      const lastTime = previous ? loadAt(previous, ex.id, i) : '';
      return (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 0', minWidth: 0, maxWidth: 68 }}>
          {button}
          {ex.reps != null && (
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={repsAt(session, ex, i)}
              onChange={(e) => commit(withField(session, 'reps', ex.id, i, e.target.value))}
              aria-label={`${ex.name} set ${i + 1} ${repsWord.toLowerCase()}`}
              style={fieldStyle}
            />
          )}
          {ex.load && (
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={loadAt(session, ex.id, i)}
              placeholder={carriedLoad(session, ex.id, i) || lastTime || 'lb'}
              onChange={(e) => commit(withField(session, 'load', ex.id, i, e.target.value))}
              aria-label={`${ex.name} set ${i + 1} weight in pounds`}
              style={fieldStyle}
            />
          )}
        </div>
      );
    });

    return (
      <article
        key={ex.id}
        style={{
          background: complete ? 'transparent' : C.card,
          border: `1px solid ${current ? C.accent : C.line}`,
          boxShadow: current ? `inset 5px 0 0 ${C.accent}` : undefined,
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 600, lineHeight: 1.2, color: complete ? C.muted : C.ink }}>
            {letter && <span style={{ fontFamily: DISPLAY, marginRight: 6, color: C.dim }}>{letter}</span>}
            {ex.name}
          </h3>
          {ex.video && (
            <a
              href={ex.video}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Watch a demo of ${ex.name}`}
              style={{
                flex: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                height: 40,
                padding: '0 12px',
                borderRadius: 999,
                border: `1px solid ${C.lineStrong}`,
                color: C.ink,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              ▶ Demo
            </a>
          )}
        </div>
        <p style={{ margin: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 8px' }}>
          <span style={{ fontFamily: DISPLAY, fontSize: 28, lineHeight: 1, letterSpacing: '0.02em', color: complete ? C.muted : C.ink }}>
            {(ex.sets > 1 ? `${ex.sets} × ` : '') + ex.target}
          </span>
          {tags.map((tag) => (
            <span
              key={tag}
              style={{ fontSize: 13, padding: '2px 8px', borderRadius: 999, border: `1px solid ${C.line}`, color: C.muted, whiteSpace: 'nowrap' }}
            >
              {tag}
            </span>
          ))}
        </p>
        {ex.cue && <p style={{ margin: 0, fontSize: 15, color: C.muted }}>{ex.cue}</p>}
        <div role="group" aria-label="Sets" style={{ display: 'flex', flexWrap: hasFields ? 'nowrap' : 'wrap', gap: hasFields ? 8 : 10 }}>
          {hasFields && (
            <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 'none' }}>
              <span style={{ ...rowLabelStyle, height: 54 }}>Set</span>
              {ex.reps != null && <span style={rowLabelStyle}>{repsWord}</span>}
              {ex.load && <span style={rowLabelStyle}>Lb</span>}
            </div>
          )}
          {columns}
        </div>
        {hasFields && (
          <p style={{ margin: 0, fontSize: 13, color: C.dim }}>
            {ex.reps != null ? `${ex.timedSec ? 'Seconds' : 'Reps'} start at the recommended number. Change any set. ` : ''}
            {ex.load ? 'A blank lb uses the set before it.' : ''}
          </p>
        )}
        {ex.timedSec != null && (
          <button
            type="button"
            onClick={() => startWork(ex)}
            style={{
              alignSelf: 'flex-start',
              height: 46,
              padding: '0 16px',
              borderRadius: 10,
              border: `2px solid ${C.ink}`,
              background: 'transparent',
              color: C.ink,
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            Start {ex.timedSec} sec timer ({WORK_LEAD_IN_SEC} sec lead-in)
          </button>
        )}
      </article>
    );
  }

  const timerLeft = timer ? Math.max(0, (timer.endsAt - now) / 1000) : 0;
  const saveText =
    saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Not saved yet, retrying' : '';
  const h2Style: CSSProperties = { margin: 0, fontFamily: DISPLAY, fontSize: 24, letterSpacing: '0.05em', fontWeight: 400 };
  const quietButton: CSSProperties = {
    height: 44,
    padding: '0 14px',
    borderRadius: 10,
    border: `1px solid ${C.lineStrong}`,
    background: 'transparent',
    color: C.muted,
    fontSize: 15,
    cursor: 'pointer',
  };
  const primaryButton: CSSProperties = {
    height: 52,
    padding: '0 18px',
    borderRadius: 10,
    border: 'none',
    background: C.accent,
    color: '#fff',
    fontWeight: 600,
    fontSize: 16,
    cursor: 'pointer',
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', color: C.ink, fontSize: 16, lineHeight: 1.4 }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          background: C.bg,
          padding: '12px 16px 10px',
          borderBottom: `1px solid ${C.line}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: DISPLAY, fontSize: 34, lineHeight: 1, letterSpacing: '0.03em', fontWeight: 400 }}>
              {workout.title}
            </h1>
            <p style={{ margin: '2px 0 0', color: C.muted, fontSize: 14 }}>
              {workout.subtitle}
              {saveText && <span style={{ color: saveState === 'error' ? C.accent : C.dim }}> · {saveText}</span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 14, textAlign: 'right', flex: 'none' }}>
            {(
              [
                [`${totals.done}/${totals.all}`, 'Sets'],
                [clock(now ? elapsedSec(session, now) : 0), 'Elapsed'],
              ] as const
            ).map(([value, label]) => (
              <div key={label}>
                <b style={{ display: 'block', fontFamily: DISPLAY, fontSize: 26, lineHeight: 1, fontWeight: 400, fontVariantNumeric: 'tabular-nums' }}>
                  {value}
                </b>
                <span style={{ fontSize: 12, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div aria-hidden="true" style={{ height: 6, borderRadius: 3, background: C.line, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${totals.all ? (100 * totals.done) / totals.all : 0}%`, background: C.done, borderRadius: 3 }} />
        </div>
      </header>

      <div style={{ padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 26 }}>
        {workout.blocks.map((block) => {
          const exercises = block.groups.flatMap((g) => g.exercises);
          const sets = exercises.reduce((n, ex) => n + ex.sets, 0);
          const done = exercises.reduce((n, ex) => n + doneCount(session, ex), 0);
          return (
            <section key={block.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <h2 style={h2Style}>{block.title}</h2>
                <span style={{ color: C.dim, fontSize: 14 }}>
                  {done} of {sets}
                </span>
              </div>
              {block.note && <p style={{ margin: '-6px 0 0', color: C.muted, fontSize: 15 }}>{block.note}</p>}
              {block.groups.map((group, g) => {
                const superset = group.exercises.length > 1;
                return (
                  <div
                    key={g}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      borderLeft: superset ? `4px solid ${C.lineStrong}` : undefined,
                      paddingLeft: superset ? 10 : 0,
                    }}
                  >
                    {superset && (
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.muted }}>
                        Superset, {group.exercises[0].sets} rounds. Alternate{' '}
                        {group.exercises.map((_, k) => String.fromCharCode(65 + k)).join(' and ')}.
                      </p>
                    )}
                    {group.exercises.map((ex, k) => renderExercise(ex, superset ? String.fromCharCode(65 + k) : ''))}
                  </div>
                );
              })}
            </section>
          );
        })}

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={h2Style}>
            <label htmlFor="strength-notes">Notes</label>
          </h2>
          <textarea
            id="strength-notes"
            rows={4}
            value={session.notes}
            maxLength={2000}
            placeholder="How it felt, what to change next time"
            onChange={(e) => commit({ ...session, notes: e.target.value })}
            style={{
              width: '100%',
              minHeight: 110,
              padding: 12,
              resize: 'vertical',
              background: C.card,
              border: `2px solid ${C.line}`,
              borderRadius: 10,
              color: C.ink,
              font: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={h2Style}>Summary image</h2>
          <p style={{ margin: '-6px 0 0', color: C.muted, fontSize: 15 }}>
            A share card with your sets, weights, time and notes, sized for a Strava photo.
          </p>
          <button type="button" onClick={makeSummary} style={{ ...primaryButton, alignSelf: 'flex-start' }}>
            {summaryUrl ? 'Update summary image' : 'Create summary image'}
          </button>
          {summaryError && <p style={{ margin: 0, color: C.accent, fontSize: 14 }}>{summaryError}</p>}
          {summaryUrl && (
            <>
              {/* A plain img: a data URL can't go through next/image, and the card is already the right size. */}
              <img
                src={summaryUrl}
                alt={`${workout.title} summary card`}
                style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 10, border: `1px solid ${C.line}` }}
              />
              <a
                href={summaryUrl}
                download={`${workout.id}-${session.date}.png`}
                style={{ ...primaryButton, alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
              >
                Download image
              </a>
              <p style={{ margin: 0, fontSize: 13, color: C.dim }}>On a phone you can also press and hold the image to save it to Photos.</p>
            </>
          )}
        </section>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button type="button" onClick={() => setSoundOn((on) => !on)} style={quietButton}>
            {soundOn ? 'Timer sound on' : 'Timer sound off'}
          </button>
          <button type="button" onClick={reset} style={quietButton}>
            {now < resetArmedUntil ? 'Tap again to clear every set' : 'Reset today'}
          </button>
        </div>
      </div>

      <aside
        aria-live="polite"
        style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 5,
          background: flashing ? C.accent : '#1c1c1c',
          borderTop: `1px solid ${C.lineStrong}`,
          color: C.ink,
          padding: '12px 16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {timer ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted }}>
                  {timer.kind === 'ready' ? 'Get ready' : timer.kind === 'work' ? 'Work' : 'Rest'}
                </div>
                <div style={{ fontFamily: DISPLAY, fontSize: 60, lineHeight: 0.9, color: C.accent, fontVariantNumeric: 'tabular-nums' }}>
                  {clock(Math.ceil(timerLeft))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
                <button
                  type="button"
                  onClick={() => setTimer({ ...timer, endsAt: timer.endsAt + 15000, total: timer.total + 15 })}
                  style={{ ...quietButton, height: 48, color: C.ink, fontWeight: 600 }}
                >
                  +15 sec
                </button>
                <button type="button" onClick={() => setTimer(null)} style={{ ...quietButton, height: 48, color: C.ink, fontWeight: 600 }}>
                  {timer.kind === 'rest' ? 'Skip' : 'Stop'}
                </button>
              </div>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: C.line, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (100 * timerLeft) / timer.total)}%`, background: C.accent, borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 14, color: C.muted }}>
              {timer.kind !== 'rest' ? timer.label : next ? `Next: ${nextLine(next)}` : 'Last set done'}
            </div>
          </>
        ) : next ? (
          <>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: flashing ? '#fff' : C.muted }}>
              {flashing ? 'Go' : session.startedAt ? 'Next up' : 'Start with'}
            </div>
            <div style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.2 }}>{nextLine(next)}</div>
            <div style={{ fontSize: 14, color: flashing ? '#fff' : C.muted }}>
              {next.ex.target}
              {next.ex.tempo ? `, ${next.ex.tempo}` : ''}. Tap the orange button when the set is finished.
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted }}>Session complete</div>
            <div style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.2 }}>
              {workout.title} done in {clock(elapsedSec(session, now))}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
