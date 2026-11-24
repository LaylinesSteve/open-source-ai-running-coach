/**
 * Strength sessions that stack with the running plan.
 *
 * A workout is plain data: blocks → groups → exercises. The tracker UI at
 * /app/plan/[id]/strength renders any workout in this shape, so a new session
 * (hand-written here, or generated later) needs no UI changes.
 */

export interface StrengthExercise {
  id: string;
  name: string;
  sets: number;
  /** What one set is, as shown to the athlete (e.g. "6-8 / side", "35 min"). */
  target: string;
  /** Tempo cue shown as a tag (e.g. "3 sec down"). */
  tempo?: string;
  /** Rest after each set in seconds. 0 = move straight on (first half of a superset, warm-ups). */
  restSec: number;
  /** Adds a work countdown of this many seconds, with a get-ready lead-in. */
  timedSec?: number;
  /** Show a weight field for every set. */
  load?: boolean;
  /** Recommended count, prefilled in each set's editable field. Seconds when timedSec is set. */
  reps?: number;
  cue?: string;
  /** Demo video URL. */
  video?: string;
}

/** Two or more exercises in a group are a superset, done in alternating rounds. */
export interface StrengthGroup {
  exercises: StrengthExercise[];
}

export interface StrengthBlock {
  id: string;
  title: string;
  note?: string;
  groups: StrengthGroup[];
}

export interface StrengthWorkout {
  id: string;
  title: string;
  subtitle: string;
  blocks: StrengthBlock[];
}

export type SetValues = (string | null)[];

/** What the athlete actually did in one workout on one day. Stored on the plan as strengthLog. */
export interface StrengthSession {
  workoutId: string;
  /** Athlete's local date, YYYY-MM-DD. */
  date: string;
  /** exerciseId → one flag per set. */
  done: Record<string, boolean[]>;
  /** exerciseId → weight in lb per set, as typed. null = set not touched. */
  load: Record<string, SetValues>;
  /** exerciseId → reps (or seconds) per set, as typed. null = set not touched, so the recommended count applies. */
  reps: Record<string, SetValues>;
  notes: string;
  /** Epoch ms of the first completed set. */
  startedAt: number | null;
  /** Epoch ms when the last set was completed. */
  finishedAt: number | null;
  /** ISO time of the athlete's last change, used to pick the newer of two copies. */
  updatedAt?: string;
}

/** Seconds of "get ready" before any timed exercise starts counting. */
export const WORK_LEAD_IN_SEC = 10;

export const STRENGTH_WORKOUTS: StrengthWorkout[] = [
  {
    id: 'strength-a',
    title: 'Strength A',
    subtitle: 'Dumbbells and a bench. Lift, then run.',
    blocks: [
      {
        id: 'warmup',
        title: 'Warm-up',
        note: 'About 4 minutes, no rest between moves.',
        groups: [
          { exercises: [{ id: 'wu-squat', name: 'Bodyweight squat', sets: 1, target: '10 reps', restSec: 0, video: 'https://www.youtube.com/watch?v=rMvwVtlqjTE' }] },
          { exercises: [{ id: 'wu-swing', name: 'Leg swing', sets: 1, target: '10 / side', restSec: 0, video: 'https://www.youtube.com/watch?v=0XvKtEZ4i38' }] },
          { exercises: [{ id: 'wu-bridge', name: 'Glute bridge', sets: 1, target: '10 reps', restSec: 0, video: 'https://www.youtube.com/shorts/R1OXPHRqehw' }] },
          { exercises: [{ id: 'wu-split', name: 'Light split squat', sets: 1, target: '1 set / side', restSec: 0 }] },
        ],
      },
      {
        id: 'main',
        title: 'Main work',
        note: 'Leave 2 reps in reserve on every set. Start a notch lighter than you think on the split squats.',
        groups: [
          {
            exercises: [
              {
                id: 'bss',
                name: 'Bulgarian split squat',
                sets: 4,
                target: '6-8 / side',
                tempo: '3 sec down',
                restSec: 90,
                load: true,
                reps: 8,
                cue: 'Rear foot on the bench, dumbbells at your sides. Front shin close to vertical.',
                video: 'https://www.youtube.com/shorts/iwV9rTHKrOg',
              },
            ],
          },
          {
            exercises: [
              {
                id: 'rdl',
                name: 'Dumbbell Romanian deadlift',
                sets: 3,
                target: '8-10',
                restSec: 75,
                load: true,
                reps: 10,
                cue: 'Hinge at the hips, soft knees, dumbbells close to the legs.',
                video: 'https://www.youtube.com/watch?v=gMHKINEpe2c',
              },
            ],
          },
          {
            exercises: [
              {
                id: 'stepdown',
                name: 'Lateral step-down',
                sets: 3,
                target: '8 / side',
                tempo: '3 sec down',
                restSec: 0,
                load: true,
                reps: 8,
                cue: 'Stand sideways on a stair or low step (6-10 in) and lower the free heel to tap the floor. A bench is too high for most people. Bodyweight is enough to start.',
                video: 'https://www.youtube.com/watch?v=sbp9xv5j87s',
              },
              {
                id: 'row',
                name: 'Single-arm dumbbell row',
                sets: 3,
                target: '10 / side',
                restSec: 60,
                load: true,
                reps: 10,
                cue: 'Hand and knee on the bench, pull to the hip.',
                video: 'https://www.youtube.com/watch?v=S_kOe9mOLlg',
              },
            ],
          },
          {
            exercises: [
              {
                id: 'calf',
                name: 'Single-leg calf raise',
                sets: 3,
                target: '12-15 / side',
                tempo: 'Slow lower',
                restSec: 0,
                load: true,
                reps: 15,
                cue: 'Dumbbell in one hand, other hand on the bench for balance.',
                video: 'https://www.youtube.com/watch?v=XWzZ6jOE4So',
              },
              {
                id: 'press',
                name: 'Dumbbell bench press',
                sets: 3,
                target: '8-10',
                restSec: 60,
                load: true,
                reps: 10,
                video: 'https://www.youtube.com/watch?v=U14BvBQNi2M',
              },
            ],
          },
          {
            exercises: [
              {
                id: 'march',
                name: 'Suitcase march',
                sets: 3,
                target: '30-40 sec / side',
                restSec: 45,
                timedSec: 40,
                load: true,
                reps: 40,
                cue: 'One heavy dumbbell at your side, march in place with high knees. Shoulders level, no leaning.',
                video: 'https://www.youtube.com/watch?v=4Xo94AkUuWs',
              },
            ],
          },
        ],
      },
      {
        id: 'run',
        title: 'Then run',
        groups: [
          {
            exercises: [
              {
                id: 'easy-run',
                name: 'Easy run',
                sets: 1,
                target: '35 min',
                restSec: 0,
                cue: 'Conversational effort. Heavy legs are expected after the lift.',
              },
            ],
          },
        ],
      },
    ],
  },
];

export function getStrengthWorkout(id?: string | null): StrengthWorkout | null {
  if (!id) return STRENGTH_WORKOUTS[0] ?? null;
  return STRENGTH_WORKOUTS.find((w) => w.id === id) ?? null;
}

export function emptySession(workoutId: string, date: string): StrengthSession {
  return { workoutId, date, done: {}, load: {}, reps: {}, notes: '', startedAt: null, finishedAt: null };
}

export function allExercises(workout: StrengthWorkout): StrengthExercise[] {
  return workout.blocks.flatMap((b) => b.groups.flatMap((g) => g.exercises));
}

/** The order sets are performed in: supersets alternate by round. */
export function setSequence(workout: StrengthWorkout): { ex: StrengthExercise; i: number }[] {
  const seq: { ex: StrengthExercise; i: number }[] = [];
  for (const block of workout.blocks) {
    for (const group of block.groups) {
      const rounds = Math.max(0, ...group.exercises.map((ex) => ex.sets));
      for (let r = 0; r < rounds; r++) {
        for (const ex of group.exercises) {
          if (r < ex.sets) seq.push({ ex, i: r });
        }
      }
    }
  }
  return seq;
}

export function isSetDone(session: StrengthSession, exId: string, i: number): boolean {
  return !!session.done[exId]?.[i];
}

export function doneCount(session: StrengthSession, ex: StrengthExercise): number {
  let n = 0;
  for (let i = 0; i < ex.sets; i++) if (isSetDone(session, ex.id, i)) n++;
  return n;
}

export function nextUp(workout: StrengthWorkout, session: StrengthSession): { ex: StrengthExercise; i: number } | null {
  return setSequence(workout).find((s) => !isSetDone(session, s.ex.id, s.i)) ?? null;
}

export function sessionTotals(workout: StrengthWorkout, session: StrengthSession): { done: number; all: number } {
  const seq = setSequence(workout);
  return { done: seq.filter((s) => isSetDone(session, s.ex.id, s.i)).length, all: seq.length };
}

/** Weight typed for a set, or "" when the field is blank. */
export function loadAt(session: StrengthSession, exId: string, i: number): string {
  const v = session.load[exId]?.[i];
  return v == null ? '' : String(v);
}

/** Weight a blank set inherits: the nearest earlier set of the same exercise. */
export function carriedLoad(session: StrengthSession, exId: string, i: number): string {
  for (let k = i - 1; k >= 0; k--) {
    const v = loadAt(session, exId, k);
    if (v !== '') return v;
  }
  return '';
}

/** Reps shown for a set: what was typed, otherwise the recommended count. */
export function repsAt(session: StrengthSession, ex: StrengthExercise, i: number): string {
  const v = session.reps[ex.id]?.[i];
  if (v != null) return String(v);
  return ex.reps != null ? String(ex.reps) : '';
}

function withValue(map: Record<string, SetValues>, exId: string, i: number, value: string): Record<string, SetValues> {
  const arr: SetValues = Array.from({ length: Math.max(i + 1, map[exId]?.length ?? 0) }, (_, k) => map[exId]?.[k] ?? null);
  arr[i] = value;
  return { ...map, [exId]: arr };
}

export function withField(
  session: StrengthSession,
  field: 'load' | 'reps',
  exId: string,
  i: number,
  value: string
): StrengthSession {
  return { ...session, [field]: withValue(session[field], exId, i, value) };
}

/**
 * Toggle one set. Marking a set done records the reps shown and locks in a
 * carried weight, so the log holds what the athlete saw when they tapped.
 */
export function withSetToggled(
  workout: StrengthWorkout,
  session: StrengthSession,
  ex: StrengthExercise,
  i: number,
  nowMs: number
): StrengthSession {
  const flags = (session.done[ex.id] ?? []).slice();
  const nowDone = !flags[i];
  flags[i] = nowDone;
  let next: StrengthSession = { ...session, done: { ...session.done, [ex.id]: flags } };
  if (nowDone) {
    if (ex.reps != null && session.reps[ex.id]?.[i] == null) {
      next = withField(next, 'reps', ex.id, i, String(ex.reps));
    }
    if (ex.load && loadAt(session, ex.id, i) === '') {
      const carried = carriedLoad(session, ex.id, i);
      if (carried !== '') next = withField(next, 'load', ex.id, i, carried);
    }
    if (!next.startedAt) next.startedAt = nowMs;
  }
  next.finishedAt = nextUp(workout, next) ? null : nowMs;
  return next;
}

export interface SummaryRow {
  name: string;
  text: string;
}

function describeSets(sets: { reps: string; lb: string }[], unit: string): string {
  const lbOf = (s: { lb: string }) => (s.lb !== '' && Number(s.lb) > 0 ? s.lb : '');
  const same = sets.every((s) => s.reps === sets[0].reps && s.lb === sets[0].lb);
  if (same) {
    const lb = lbOf(sets[0]);
    return `${sets.length} × ${sets[0].reps || '?'}${unit}${lb ? ` @ ${lb} lb` : ''}`;
  }
  const anyLb = sets.some((s) => lbOf(s));
  return sets.map((s) => `${s.reps || '?'}${unit}${lbOf(s) ? ` @ ${lbOf(s)}` : ''}`).join(',  ') + (anyLb ? ' lb' : '');
}

/**
 * Completed work, one row per exercise that logs reps or weight.
 * volumeLb is reps × weight as logged; per-side lifts count one side.
 */
export function sessionSummary(workout: StrengthWorkout, session: StrengthSession): { rows: SummaryRow[]; volumeLb: number } {
  const rows: SummaryRow[] = [];
  let volume = 0;
  for (const ex of allExercises(workout)) {
    if (!ex.load && ex.reps == null) continue;
    const sets: { reps: string; lb: string }[] = [];
    for (let i = 0; i < ex.sets; i++) {
      if (!isSetDone(session, ex.id, i)) continue;
      const s = { reps: repsAt(session, ex, i), lb: loadAt(session, ex.id, i) };
      sets.push(s);
      if (!ex.timedSec) volume += (Number(s.reps) || 0) * (Number(s.lb) || 0);
    }
    if (sets.length) rows.push({ name: ex.name, text: describeSets(sets, ex.timedSec ? ' sec' : '') });
  }
  return { rows, volumeLb: Math.round(volume) };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const NUMBER_RE = /^\d{0,4}(\.\d{0,2})?$/;

export function isSessionDate(value: unknown): value is string {
  return typeof value === 'string' && DATE_RE.test(value);
}

function cleanNumbers(input: unknown, sets: number): SetValues | null {
  if (!Array.isArray(input)) return null;
  const out: SetValues = [];
  for (let i = 0; i < sets; i++) {
    const raw = input[i];
    if (raw == null) {
      out.push(null);
      continue;
    }
    const text = String(raw).trim();
    // A cleared field stays "" so it isn't refilled with the recommended count.
    out.push(NUMBER_RE.test(text) ? text : '');
  }
  return out.some((v) => v != null) ? out : null;
}

function cleanTime(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

/**
 * Rebuild a session from untrusted input, keeping only what this workout defines.
 * Returns null when the input isn't a session for this workout.
 */
export function sanitizeSession(workout: StrengthWorkout, input: unknown): StrengthSession | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  if (!isSessionDate(raw.date)) return null;
  const session = emptySession(workout.id, raw.date);
  const done = (raw.done ?? {}) as Record<string, unknown>;
  const load = (raw.load ?? {}) as Record<string, unknown>;
  const reps = (raw.reps ?? {}) as Record<string, unknown>;
  for (const ex of allExercises(workout)) {
    const flags = done[ex.id];
    if (Array.isArray(flags)) {
      const clean = Array.from({ length: ex.sets }, (_, i) => flags[i] === true);
      if (clean.some(Boolean)) session.done[ex.id] = clean;
    }
    if (ex.load) {
      const clean = cleanNumbers(load[ex.id], ex.sets);
      if (clean) session.load[ex.id] = clean;
    }
    if (ex.reps != null) {
      const clean = cleanNumbers(reps[ex.id], ex.sets);
      if (clean) session.reps[ex.id] = clean;
    }
  }
  session.notes = typeof raw.notes === 'string' ? raw.notes.slice(0, 2000) : '';
  session.startedAt = cleanTime(raw.startedAt);
  session.finishedAt = cleanTime(raw.finishedAt);
  if (typeof raw.updatedAt === 'string' && raw.updatedAt.length <= 40 && !Number.isNaN(Date.parse(raw.updatedAt))) {
    session.updatedAt = raw.updatedAt;
  }
  return session;
}
