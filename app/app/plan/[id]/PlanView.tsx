'use client';

import React from 'react';
import SyncButton from './SyncButton';

/** Override so "Build to race day" bars are height-proportional for both new and legacy stored plans. */
const progressBarChartOverride = `
.plan-content .progress-grid { align-items: stretch !important; }
.plan-content .progress-bar-wrap { height: 100% !important; justify-content: flex-end !important; }
.plan-sync-strava-sticky:hover { background: rgba(232, 93, 4, 0.12) !important; color: #ff6b1a !important; }
`;

function PlanView({
  html,
  planId,
  hasStrava,
}: {
  html: string;
  planId: string;
  hasStrava?: boolean;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <style dangerouslySetInnerHTML={{ __html: progressBarChartOverride }} />
      {hasStrava ? <SyncButton planId={planId} variant="sticky" /> : null}
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
    prev.html === next.html
);
