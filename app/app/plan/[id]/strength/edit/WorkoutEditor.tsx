'use client';

import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { StrengthWorkout } from '@/lib/strength';
import { WORKOUT_LIMITS } from '@/lib/strength';

const C = {
  bg: '#0a0a0a',
  card: '#141414',
  line: '#262626',
  lineStrong: '#404040',
  ink: '#f5f5f5',
  muted: '#a3a3a3',
  dim: '#737373',
  accent: '#e85d04',
};
const DISPLAY = '"Bebas Neue", sans-serif';

/** Form state: numbers stay as text so a field can be empty while the athlete types. */
type ExerciseDraft = {
  key: string;
  id: string;
  name: string;
  sets: string;
  target: string;
  reps: string;
  load: boolean;
  restSec: string;
  tempo: string;
  timedSec: string;
  cue: string;
  video: string;
  /** Superset with the exercise above (same group in the saved workout). */
  linked: boolean;
};
type BlockDraft = { key: string; id: string; title: string; note: string; exercises: ExerciseDraft[] };
type Draft = { id: string; title: string; subtitle: string; blocks: BlockDraft[] };

function blankExercise(key: string): ExerciseDraft {
  return { key, id: '', name: '', sets: '3', target: '', reps: '', load: true, restSec: '60', tempo: '', timedSec: '', cue: '', video: '', linked: false };
}

function toDraft(workout: StrengthWorkout | null, keepId: boolean, nextKey: () => string): Draft {
  if (!workout) {
    return {
      id: '',
      title: '',
      subtitle: '',
      blocks: [
        { key: nextKey(), id: '', title: 'Warm-up', note: '', exercises: [{ ...blankExercise(nextKey()), sets: '1', load: false, restSec: '0' }] },
        { key: nextKey(), id: '', title: 'Main work', note: '', exercises: [blankExercise(nextKey())] },
      ],
    };
  }
  return {
    id: keepId ? workout.id : '',
    title: workout.title,
    subtitle: workout.subtitle,
    blocks: workout.blocks.map((block) => ({
      key: nextKey(),
      id: block.id,
      title: block.title,
      note: block.note ?? '',
      exercises: block.groups.flatMap((group) =>
        group.exercises.map((ex, k) => ({
          key: nextKey(),
          id: ex.id,
          name: ex.name,
          sets: String(ex.sets),
          target: ex.target,
          reps: ex.reps != null ? String(ex.reps) : '',
          load: !!ex.load,
          restSec: String(ex.restSec),
          tempo: ex.tempo ?? '',
          timedSec: ex.timedSec != null ? String(ex.timedSec) : '',
          cue: ex.cue ?? '',
          video: ex.video ?? '',
          linked: k > 0,
        }))
      ),
    })),
  };
}

/** The shape the save route expects. The server validates and trims it, so this only regroups supersets. */
function fromDraft(draft: Draft) {
  return {
    id: draft.id,
    title: draft.title,
    subtitle: draft.subtitle,
    blocks: draft.blocks.map((block) => {
      const groups: { exercises: Record<string, unknown>[] }[] = [];
      block.exercises.forEach((ex, k) => {
        const exercise = {
          id: ex.id,
          name: ex.name,
          sets: ex.sets,
          target: ex.target,
          reps: ex.reps,
          load: ex.load,
          restSec: ex.restSec,
          tempo: ex.tempo,
          timedSec: ex.timedSec,
          cue: ex.cue,
          video: ex.video,
        };
        const last = groups[groups.length - 1];
        if (k > 0 && ex.linked && last && last.exercises.length < WORKOUT_LIMITS.exercisesPerGroup) last.exercises.push(exercise);
        else groups.push({ exercises: [exercise] });
      });
      return { id: block.id, title: block.title, note: block.note, groups };
    }),
  };
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const copy = list.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

const input: CSSProperties = {
  width: '100%',
  minHeight: 44,
  padding: '8px 10px',
  background: C.bg,
  border: `1px solid ${C.lineStrong}`,
  borderRadius: 8,
  color: C.ink,
  fontSize: 16,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};
const label: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: C.muted, minWidth: 0 };
const quiet: CSSProperties = {
  minHeight: 40,
  padding: '0 12px',
  borderRadius: 8,
  border: `1px solid ${C.lineStrong}`,
  background: 'transparent',
  color: C.ink,
  fontSize: 14,
  cursor: 'pointer',
};
const primary: CSSProperties = {
  minHeight: 50,
  padding: '0 18px',
  borderRadius: 10,
  border: 'none',
  background: C.accent,
  color: '#fff',
  fontWeight: 600,
  fontSize: 16,
  cursor: 'pointer',
};
const h2: CSSProperties = { margin: 0, fontFamily: DISPLAY, fontSize: 24, letterSpacing: '0.05em', fontWeight: 400 };

export default function WorkoutEditor({
  planId,
  initial,
  isOwn,
  aiEnabled,
}: {
  planId: string;
  /** Workout to start from, or null for a blank one. */
  initial: StrengthWorkout | null;
  /** True when `initial` belongs to this plan, so saving replaces it. A built-in saves as a new copy. */
  isOwn: boolean;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const keys = useRef(0);
  const nextKey = () => `k${++keys.current}`;
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial, isOwn, nextKey));
  const [request, setRequest] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [draftNote, setDraftNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteArmed, setDeleteArmed] = useState(false);

  const trackerUrl = (workoutId?: string) =>
    `/app/plan/${planId}/strength${workoutId ? `?workout=${encodeURIComponent(workoutId)}` : ''}`;

  function setBlock(b: number, change: Partial<BlockDraft>) {
    setDraft((d) => ({ ...d, blocks: d.blocks.map((block, k) => (k === b ? { ...block, ...change } : block)) }));
  }
  function setExercise(b: number, e: number, change: Partial<ExerciseDraft>) {
    setDraft((d) => ({
      ...d,
      blocks: d.blocks.map((block, k) =>
        k === b ? { ...block, exercises: block.exercises.map((ex, j) => (j === e ? { ...ex, ...change } : ex)) } : block
      ),
    }));
  }

  /** In a superset you move straight from the first exercise to the second, so linking clears the rest on the one above. */
  function linkToAbove(b: number, e: number, linked: boolean) {
    setDraft((d) => ({
      ...d,
      blocks: d.blocks.map((block, k) =>
        k === b
          ? {
              ...block,
              exercises: block.exercises.map((ex, j) =>
                j === e ? { ...ex, linked } : j === e - 1 && linked ? { ...ex, restSec: '0' } : ex
              ),
            }
          : block
      ),
    }));
  }

  async function askCoach() {
    const text = request.trim();
    if (!text || drafting) return;
    setError('');
    setDraftNote('');
    setDrafting(true);
    try {
      const res = await fetch(`/api/plan/${planId}/strength/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.workout) {
        setError(data.error || 'The coach could not draft a workout.');
      } else {
        // Keep this workout's id so saving the draft replaces the workout being edited instead of adding a second one.
        setDraft((d) => ({ ...toDraft(data.workout as StrengthWorkout, false, nextKey), id: d.id }));
        setDraftNote('Draft loaded below. Check the exercises, weights and rests, then save.');
      }
    } catch {
      setError('Something went wrong reaching the coach.');
    }
    setDrafting(false);
  }

  async function save() {
    if (saving) return;
    if (!draft.title.trim()) {
      setError('Give the workout a title.');
      return;
    }
    if (!draft.blocks.some((block) => block.exercises.some((ex) => ex.name.trim()))) {
      setError('Add at least one exercise with a name.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`/api/plan/${planId}/strength/workouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fromDraft(draft)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.workout) {
        setError(data.error || 'Could not save the workout.');
        setSaving(false);
        return;
      }
      router.push(trackerUrl(data.workout.id));
      router.refresh();
    } catch {
      setError('Something went wrong saving the workout.');
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }
    setError('');
    try {
      const res = await fetch(`/api/plan/${planId}/strength/workouts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draft.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Could not delete the workout.');
        return;
      }
      router.push(trackerUrl());
      router.refresh();
    } catch {
      setError('Something went wrong deleting the workout.');
    }
  }

  const heading = isOwn ? 'Edit workout' : initial ? 'Copy workout' : 'New workout';

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '1rem 1rem 2rem', display: 'flex', flexDirection: 'column', gap: 22, fontSize: 16, lineHeight: 1.4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h1 style={{ margin: 0, fontFamily: DISPLAY, fontSize: 34, lineHeight: 1, letterSpacing: '0.03em', fontWeight: 400 }}>{heading}</h1>
        <Link href={trackerUrl(initial?.id)} style={{ ...quiet, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
          Cancel
        </Link>
      </div>
      {initial && !isOwn && (
        <p style={{ margin: '-10px 0 0', color: C.muted, fontSize: 15 }}>
          {initial.title} is a built-in workout, so it can&apos;t be changed. Saving makes your own copy.
        </p>
      )}

      <section style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 style={h2}>
          <label htmlFor="coach-request">Describe it to the coach</label>
        </h2>
        {aiEnabled ? (
          <>
            <p style={{ margin: 0, color: C.muted, fontSize: 15 }}>
              Say what equipment you have, how long you have, and anything to include or avoid. The draft replaces what is in the form below, and nothing is saved until you save it.
            </p>
            <textarea
              id="coach-request"
              rows={3}
              value={request}
              maxLength={1500}
              placeholder="Dumbbells and a bench, 40 minutes, include Bulgarian split squats. A 35 minute easy run follows."
              onChange={(e) => setRequest(e.target.value)}
              style={{ ...input, resize: 'vertical' }}
            />
            <button type="button" onClick={askCoach} disabled={drafting || !request.trim()} style={{ ...primary, alignSelf: 'flex-start', opacity: drafting || !request.trim() ? 0.6 : 1 }}>
              {drafting ? 'Drafting…' : 'Draft workout'}
            </button>
            {draftNote && <p style={{ margin: 0, color: C.ink, fontSize: 14 }}>{draftNote}</p>}
          </>
        ) : (
          <p style={{ margin: 0, color: C.muted, fontSize: 15 }}>
            The coach needs GEMINI_API_KEY set on the server. You can still build the workout by hand below.
          </p>
        )}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={label}>
          Title
          <input value={draft.title} maxLength={60} placeholder="Strength B" onChange={(e) => setDraft({ ...draft, title: e.target.value })} style={input} />
        </label>
        <label style={label}>
          Subtitle (optional)
          <input
            value={draft.subtitle}
            maxLength={120}
            placeholder="Dumbbells and a bench. Lift, then run."
            onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
            style={input}
          />
        </label>
      </section>

      {draft.blocks.map((block, b) => (
        <section key={block.key} style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: `1px solid ${C.line}`, paddingTop: 16 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <label style={{ ...label, flex: 1 }}>
              Block {b + 1} title
              <input value={block.title} maxLength={40} placeholder="Main work" onChange={(e) => setBlock(b, { title: e.target.value })} style={input} />
            </label>
            <button type="button" aria-label={`Move block ${b + 1} up`} disabled={b === 0} onClick={() => setDraft({ ...draft, blocks: move(draft.blocks, b, b - 1) })} style={{ ...quiet, minHeight: 44, opacity: b === 0 ? 0.4 : 1 }}>
              ↑
            </button>
            <button
              type="button"
              aria-label={`Move block ${b + 1} down`}
              disabled={b === draft.blocks.length - 1}
              onClick={() => setDraft({ ...draft, blocks: move(draft.blocks, b, b + 1) })}
              style={{ ...quiet, minHeight: 44, opacity: b === draft.blocks.length - 1 ? 0.4 : 1 }}
            >
              ↓
            </button>
          </div>
          <label style={label}>
            Block note (optional)
            <input value={block.note} maxLength={240} placeholder="Leave 2 reps in reserve on every set." onChange={(e) => setBlock(b, { note: e.target.value })} style={input} />
          </label>

          {block.exercises.map((ex, e) => {
            const linked = e > 0 && ex.linked;
            return (
              <div
                key={ex.key}
                style={{
                  background: C.card,
                  border: `1px solid ${C.line}`,
                  borderLeft: linked ? `4px solid ${C.lineStrong}` : `1px solid ${C.line}`,
                  borderRadius: 10,
                  padding: 12,
                  marginLeft: linked ? 12 : 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <label style={label}>
                  Exercise
                  <input value={ex.name} maxLength={60} placeholder="Bulgarian split squat" onChange={(ev) => setExercise(b, e, { name: ev.target.value })} style={input} />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                  <label style={label}>
                    Sets
                    <input type="number" inputMode="numeric" min={1} max={WORKOUT_LIMITS.sets} value={ex.sets} onChange={(ev) => setExercise(b, e, { sets: ev.target.value })} style={input} />
                  </label>
                  <label style={label}>
                    Reps to prefill
                    <input type="number" inputMode="numeric" min={1} value={ex.reps} placeholder="8" onChange={(ev) => setExercise(b, e, { reps: ev.target.value })} style={input} />
                  </label>
                  <label style={label}>
                    Rest (sec)
                    <input type="number" inputMode="numeric" min={0} max={WORKOUT_LIMITS.restSec} value={ex.restSec} onChange={(ev) => setExercise(b, e, { restSec: ev.target.value })} style={input} />
                  </label>
                </div>
                <label style={label}>
                  Target shown on the card
                  <input value={ex.target} maxLength={40} placeholder="6-8 / side" onChange={(ev) => setExercise(b, e, { target: ev.target.value })} style={input} />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, color: C.ink, minHeight: 40 }}>
                  <input type="checkbox" checked={ex.load} onChange={(ev) => setExercise(b, e, { load: ev.target.checked })} style={{ width: 22, height: 22 }} />
                  Log a weight for each set
                </label>
                {e > 0 && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, color: C.ink, minHeight: 40 }}>
                    <input type="checkbox" checked={ex.linked} onChange={(ev) => linkToAbove(b, e, ev.target.checked)} style={{ width: 22, height: 22 }} />
                    Superset with the exercise above
                  </label>
                )}
                <details>
                  <summary style={{ cursor: 'pointer', color: C.muted, fontSize: 15, minHeight: 36 }}>Tempo, timer, cue and demo link</summary>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                      <label style={label}>
                        Tempo
                        <input value={ex.tempo} maxLength={30} placeholder="3 sec down" onChange={(ev) => setExercise(b, e, { tempo: ev.target.value })} style={input} />
                      </label>
                      <label style={label}>
                        Work timer (sec)
                        <input type="number" inputMode="numeric" min={5} max={WORKOUT_LIMITS.timedSec} value={ex.timedSec} placeholder="none" onChange={(ev) => setExercise(b, e, { timedSec: ev.target.value })} style={input} />
                      </label>
                    </div>
                    <label style={label}>
                      Cue
                      <textarea rows={2} value={ex.cue} maxLength={240} placeholder="Rear foot on the bench, front shin close to vertical." onChange={(ev) => setExercise(b, e, { cue: ev.target.value })} style={{ ...input, resize: 'vertical' }} />
                    </label>
                    <label style={label}>
                      Demo video link (https)
                      <input type="url" inputMode="url" value={ex.video} maxLength={300} placeholder="https://www.youtube.com/watch?v=…" onChange={(ev) => setExercise(b, e, { video: ev.target.value })} style={input} />
                    </label>
                  </div>
                </details>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button type="button" aria-label={`Move ${ex.name || 'exercise'} up`} disabled={e === 0} onClick={() => setBlock(b, { exercises: move(block.exercises, e, e - 1) })} style={{ ...quiet, opacity: e === 0 ? 0.4 : 1 }}>
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${ex.name || 'exercise'} down`}
                    disabled={e === block.exercises.length - 1}
                    onClick={() => setBlock(b, { exercises: move(block.exercises, e, e + 1) })}
                    style={{ ...quiet, opacity: e === block.exercises.length - 1 ? 0.4 : 1 }}
                  >
                    ↓
                  </button>
                  <button type="button" onClick={() => setBlock(b, { exercises: block.exercises.filter((_, j) => j !== e) })} style={{ ...quiet, color: C.muted }}>
                    Remove exercise
                  </button>
                </div>
              </div>
            );
          })}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" onClick={() => setBlock(b, { exercises: [...block.exercises, blankExercise(nextKey())] })} style={quiet}>
              Add exercise
            </button>
            <button type="button" onClick={() => setDraft({ ...draft, blocks: draft.blocks.filter((_, k) => k !== b) })} style={{ ...quiet, color: C.muted }}>
              Remove block
            </button>
          </div>
        </section>
      ))}

      {draft.blocks.length < WORKOUT_LIMITS.blocks && (
        <button
          type="button"
          onClick={() => setDraft({ ...draft, blocks: [...draft.blocks, { key: nextKey(), id: '', title: '', note: '', exercises: [blankExercise(nextKey())] }] })}
          style={{ ...quiet, alignSelf: 'flex-start' }}
        >
          Add block
        </button>
      )}

      <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {error && (
          <p role="alert" style={{ margin: 0, color: C.accent, fontSize: 15 }}>
            {error}
          </p>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <button type="button" onClick={save} disabled={saving} style={{ ...primary, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : isOwn ? 'Save workout' : 'Save as new workout'}
          </button>
          {isOwn && (
            <button type="button" onClick={remove} style={{ ...quiet, minHeight: 50, color: deleteArmed ? C.accent : C.muted }}>
              {deleteArmed ? 'Tap again to delete this workout' : 'Delete workout'}
            </button>
          )}
        </div>
        {isOwn && (
          <p style={{ margin: 0, color: C.dim, fontSize: 13 }}>
            Sessions you already logged stay in your history. Removing an exercise hides its past sets from this workout&apos;s tracker.
          </p>
        )}
      </div>
    </div>
  );
}
