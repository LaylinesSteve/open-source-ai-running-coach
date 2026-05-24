'use client';

import CoachChatButton from './CoachChatButton';
import SyncButton from './SyncButton';
import type { CoachChatMessage } from '@/lib/store';

export default function PlanStickyActions({
  planId,
  hasStrava,
  coachChatHistory,
}: {
  planId: string;
  hasStrava: boolean;
  coachChatHistory?: CoachChatMessage[];
}) {
  return (
    <div className="plan-sticky-actions">
      {hasStrava && <SyncButton planId={planId} variant="sticky" embedded />}
      <CoachChatButton planId={planId} initialHistory={coachChatHistory} variant="sticky" />
    </div>
  );
}
