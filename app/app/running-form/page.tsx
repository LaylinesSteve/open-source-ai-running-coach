import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { hasAccess } from '@/lib/auth';
import { getFormStore } from '@/lib/store';
import RunningFormClient from './RunningFormClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Running form',
  robots: { index: false },
};

export default async function RunningFormPage() {
  if (!(await hasAccess())) {
    redirect(`/app/unlock?next=${encodeURIComponent('/app/running-form')}`);
  }
  const { runs, review, updatedAt } = await getFormStore();
  return (
    <RunningFormClient
      initialRuns={runs}
      initialReview={review}
      initialUpdatedAt={updatedAt}
      today={new Date().toISOString().slice(0, 10)}
    />
  );
}
