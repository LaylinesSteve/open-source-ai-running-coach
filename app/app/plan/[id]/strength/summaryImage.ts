import type { StrengthSession, StrengthWorkout } from '@/lib/strength';
import { sessionSummary, sessionTotals } from '@/lib/strength';

export function clock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function elapsedSec(session: StrengthSession, nowMs: number): number {
  if (!session.startedAt) return 0;
  return ((session.finishedAt ?? nowMs) - session.startedAt) / 1000;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let line = '';
  let cut = false;
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (!line || ctx.measureText(trial).width <= maxWidth) {
      line = trial;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === maxLines) {
      cut = true;
      break;
    }
  }
  if (!cut && line) lines.push(line);
  if (cut) {
    let last = `${lines[maxLines - 1]}…`;
    while (ctx.measureText(last).width > maxWidth && last.length > 2) last = `${last.slice(0, -2)}…`;
    lines[maxLines - 1] = last;
  }
  return lines;
}

/**
 * Draw the share card for a session: 1080 × 1350 (4:5), the tallest photo
 * Strava shows without cropping. Returns the canvas so the caller can show
 * and download it.
 */
export async function drawSummaryCard(
  workout: StrengthWorkout,
  session: StrengthSession,
  footer: string
): Promise<HTMLCanvasElement> {
  const DISPLAY = '"Bebas Neue", "Arial Narrow", Arial, sans-serif';
  const BODY = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  try {
    await document.fonts.load('96px "Bebas Neue"');
  } catch {
    // The card still draws with the fallback face.
  }

  const W = 1080;
  const H = 1350;
  const M = 72;
  const INK = '#f5f5f5';
  const MUTED = '#a3a3a3';
  const ACCENT = '#e85d04';
  const LINE = '#262626';

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser');
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';

  // Accent bar and title
  ctx.fillStyle = ACCENT;
  ctx.fillRect(M, 70, 24, 96);
  ctx.fillStyle = INK;
  ctx.font = `110px ${DISPLAY}`;
  ctx.fillText(workout.title.toUpperCase(), M + 48, 156);
  ctx.fillStyle = MUTED;
  ctx.font = `400 34px ${BODY}`;
  const date = new Date(`${session.date}T12:00:00`);
  ctx.fillText(
    date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
    M + 48,
    206
  );

  // Stats
  const { rows, volumeLb } = sessionSummary(workout, session);
  const totals = sessionTotals(workout, session);
  const stats: [string, string][] = [
    [`${totals.done}/${totals.all}`, 'SETS'],
    [clock(elapsedSec(session, Date.now())), 'TIME'],
  ];
  if (volumeLb > 0) stats.push([volumeLb.toLocaleString('en-US'), 'LB LIFTED']);
  const colW = (W - 2 * M) / 3;
  stats.forEach(([value, label], k) => {
    const x = M + k * colW;
    ctx.fillStyle = ACCENT;
    ctx.font = `100px ${DISPLAY}`;
    ctx.fillText(value, x, 346);
    ctx.fillStyle = MUTED;
    ctx.font = `600 24px ${BODY}`;
    ctx.fillText(label, x, 384);
  });
  ctx.fillStyle = LINE;
  ctx.fillRect(M, 424, W - 2 * M, 2);

  // What was done
  let y = 490;
  const rowH = rows.length > 7 ? 80 : 92;
  if (rows.length === 0) {
    ctx.fillStyle = MUTED;
    ctx.font = `400 34px ${BODY}`;
    ctx.fillText('No sets logged yet.', M, y);
    y += rowH;
  }
  for (const row of rows.slice(0, 9)) {
    ctx.fillStyle = INK;
    ctx.font = `600 36px ${BODY}`;
    ctx.fillText(row.name, M, y);
    let size = 32;
    ctx.font = `400 ${size}px ${BODY}`;
    while (ctx.measureText(row.text).width > W - 2 * M && size > 20) {
      size -= 2;
      ctx.font = `400 ${size}px ${BODY}`;
    }
    ctx.fillStyle = MUTED;
    ctx.fillText(row.text, M, y + 40);
    y += rowH;
  }

  // Notes, as many lines as fit above the footer
  const notes = session.notes.trim();
  if (notes && y < H - 190) {
    ctx.fillStyle = LINE;
    ctx.fillRect(M, y - 34, W - 2 * M, 2);
    ctx.fillStyle = INK;
    ctx.font = `400 30px ${BODY}`;
    const room = Math.max(1, Math.min(4, Math.floor((H - 110 - y) / 40)));
    wrapLines(ctx, notes, W - 2 * M, room).forEach((line, k) => ctx.fillText(line, M, y + 10 + k * 40));
  }

  ctx.fillStyle = MUTED;
  ctx.font = `400 26px ${BODY}`;
  ctx.fillText(footer, M, H - 56);

  return canvas;
}
