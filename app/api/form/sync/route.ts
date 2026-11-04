import { NextResponse } from 'next/server';
import { hasAccess } from '@/lib/auth';
import { FORM_WINDOW_DAYS } from '@/lib/form-trends';
import { daysAgo, downloadActivity, listRuns } from '@/lib/garmin';
import { analyzeRun } from '@/lib/garmin-fit';
import { getFormStore, setFormStore } from '@/lib/store';

export const maxDuration = 60;

/** Six months is well over 100 files, so the page calls this repeatedly and each call does a batch. */
const BATCH_SIZE = 9;
const CONCURRENCY = 3;

export async function POST(request: Request) {
  if (!(await hasAccess())) {
    return NextResponse.json({ error: 'Enter your passkey to continue.' }, { status: 401 });
  }
  const { fresh } = (await request.json().catch(() => ({}))) as { fresh?: boolean };

  try {
    const store = await getFormStore();
    if (fresh) {
      const known = new Set(store.runs.map((run) => run.id));
      const cutoff = daysAgo(FORM_WINDOW_DAYS);
      store.runs = store.runs.filter((run) => run.date >= cutoff);
      store.pending = (await listRuns(FORM_WINDOW_DAYS)).filter((run) => !known.has(run.id));
    }

    const queue = store.pending.slice(0, BATCH_SIZE);
    const finished = new Set<number>();
    const errors: string[] = [];
    let rateLimited = false;

    const worker = async () => {
      while (queue.length > 0 && !rateLimited) {
        const run = queue.shift()!;
        try {
          store.runs.push(await analyzeRun(run, await downloadActivity(run.id)));
          finished.add(run.id);
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          if (message.includes('(429)')) {
            rateLimited = true;
          } else {
            // Left out of the store, so the next refresh tries this run again.
            finished.add(run.id);
            errors.push(message);
          }
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    store.pending = store.pending.filter((run) => !finished.has(run.id));
    store.runs.sort((a, b) => b.date.localeCompare(a.date));
    store.updatedAt = new Date().toISOString();
    await setFormStore(store);

    if (errors.length > 0) {
      console.error(`Garmin form sync: ${errors.length} runs failed. First error: ${errors[0]}`);
    }
    const remaining = store.pending.length;
    const done = remaining === 0 || rateLimited;
    return NextResponse.json({
      analyzed: store.runs.length,
      remaining,
      failed: errors.length,
      rateLimited,
      ...(done ? { runs: store.runs, updatedAt: store.updatedAt } : {}),
    });
  } catch (e) {
    console.error('Garmin form sync failed:', e instanceof Error ? e.message : 'unknown error');
    return NextResponse.json({ error: 'Could not get your runs from Garmin.' }, { status: 502 });
  }
}
