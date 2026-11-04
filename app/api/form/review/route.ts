import { NextResponse } from 'next/server';
import { hasAccess } from '@/lib/auth';
import { reviewForm } from '@/lib/form-review';
import { getFormStore, setFormStore } from '@/lib/store';

export const maxDuration = 60;

export async function POST() {
  if (!(await hasAccess())) {
    return NextResponse.json({ error: 'Enter your passkey to continue.' }, { status: 401 });
  }
  try {
    const store = await getFormStore();
    if (!store.runs.some((run) => run.runningMinutes > 0)) {
      return NextResponse.json({ error: 'Analyze your runs first.' }, { status: 400 });
    }
    store.review = { text: await reviewForm(store.runs), at: new Date().toISOString() };
    await setFormStore(store);
    return NextResponse.json({ review: store.review });
  } catch (e) {
    console.error('Form review failed:', e instanceof Error ? e.message : 'unknown error');
    return NextResponse.json({ error: 'Could not write the review. Try again.' }, { status: 502 });
  }
}
