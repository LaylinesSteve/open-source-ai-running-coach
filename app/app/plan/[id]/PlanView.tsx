'use client';

import React from 'react';
import PlanStickyActions from './PlanStickyActions';
import type { CoachChatMessage } from '@/lib/store';

/** Override so "Build to race day" bars are height-proportional for both new and legacy stored plans. */
const progressBarChartOverride = `
.plan-content .progress-grid { align-items: stretch !important; }
.plan-content .progress-bar-wrap { height: 100% !important; justify-content: flex-end !important; }
.plan-sync-strava-sticky:hover { background: rgba(232, 93, 4, 0.12) !important; color: #ff6b1a !important; }
.plan-coach-chat-sticky:hover { background: rgba(232, 93, 4, 0.12) !important; color: #ff6b1a !important; }
.plan-sticky-actions {
  position: fixed;
  top: max(12px, env(safe-area-inset-top, 0px));
  right: max(12px, env(safe-area-inset-right, 0px));
  z-index: 100;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: flex-start;
  gap: 8px;
  max-width: min(100vw - 24px, 360px);
  pointer-events: none;
}
.plan-sticky-actions > * {
  pointer-events: auto;
}
.plan-sticky-actions-item {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}
.plan-sticky-actions-feedback {
  margin: 0;
  max-width: 220px;
  font-size: 0.75rem;
  line-height: 1.35;
  text-align: right;
}
@media (max-width: 640px) {
  .plan-sticky-actions {
    left: max(12px, env(safe-area-inset-left, 0px));
    max-width: none;
  }
}
`;

function PlanView({
  html,
  planId,
  hasStrava,
  coachChatHistory,
}: {
  html: string;
  planId: string;
  hasStrava?: boolean;
  coachChatHistory?: CoachChatMessage[];
}) {
  return (
    <div style={{ position: 'relative' }}>
      <style dangerouslySetInnerHTML={{ __html: progressBarChartOverride }} />
      <PlanStickyActions
        planId={planId}
        hasStrava={!!hasStrava}
        coachChatHistory={coachChatHistory}
      />
      <div
        className="plan-content"
        dangerouslySetInnerHTML={{ __html: html }}
        style={{ minHeight: '100vh' }}
      />
    </div>
  );
}

// Prevent re-renders when content unchanged so expanding a week doesn't reset the DOM
export default React.memo(
  PlanView,
  (prev, next) =>
    prev.planId === next.planId &&
    prev.hasStrava === next.hasStrava &&
    prev.html.length === next.html.length &&
    prev.html === next.html &&
    prev.coachChatHistory?.length === next.coachChatHistory?.length
);
