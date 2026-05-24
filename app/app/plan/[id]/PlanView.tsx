'use client';

import React from 'react';
import PlanStickyActions from './PlanStickyActions';
import type { CoachChatMessage } from '@/lib/store';

/** Override so "Build to race day" bars are height-proportional for both new and legacy stored plans. */
const progressBarChartOverride = `
.plan-content { overflow-x: clip; max-width: 100%; }
.plan-content .progress-grid { align-items: stretch !important; }
.plan-content .progress-bar-wrap { height: 100% !important; justify-content: flex-end !important; }
.plan-sync-strava-sticky:hover { background: rgba(232, 93, 4, 0.12) !important; color: #ff6b1a !important; }
.plan-coach-chat-sticky:hover { background: rgba(232, 93, 4, 0.12) !important; color: #ff6b1a !important; }
.plan-sticky-actions {
  position: fixed;
  top: max(12px, env(safe-area-inset-top, 0px));
  left: max(12px, env(safe-area-inset-left, 0px));
  right: max(12px, env(safe-area-inset-right, 0px));
  z-index: 100;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  overflow-x: clip;
  pointer-events: none;
}
.plan-sticky-actions > * {
  pointer-events: auto;
  flex: 0 1 auto;
  min-width: 0;
}
.plan-sticky-actions-item {
  display: contents;
}
.plan-sticky-actions-feedback {
  flex: 1 1 100%;
  margin: 0;
  max-width: 100%;
  font-size: 0.75rem;
  line-height: 1.35;
  text-align: right;
  word-break: break-word;
}
.plan-sync-strava-sticky,
.plan-coach-chat-sticky {
  padding: 8px 10px;
  background: #0a0a0a;
  color: #e85d04;
  border: 1px solid #e85d04;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
  white-space: nowrap;
  max-width: 100%;
}
@media (max-width: 640px) {
  .plan-sync-strava-sticky,
  .plan-coach-chat-sticky {
    padding: 7px 9px;
    font-size: 0.75rem;
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
