import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { formLinkKey, hasFormAccess } from '@/lib/auth';
import { getFormChat, getFormStore } from '@/lib/store';
import RunningFormClient from './RunningFormClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Running form',
  robots: { index: false },
};

export default async function RunningFormPage() {
  if (!(await hasFormAccess())) {
    redirect(`/app/unlock?next=${encodeURIComponent('/app/running-form')}`);
  }
  const [{ runs, review, updatedAt }, chat] = await Promise.all([getFormStore(), getFormChat()]);
  return (
    <RunningFormClient
      initialRuns={runs}
      initialReview={review}
      initialUpdatedAt={updatedAt}
      initialChat={chat}
      today={new Date().toISOString().slice(0, 10)}
      linkPath={`/app/running-form?key=${formLinkKey()}`}
    />
  );
}
