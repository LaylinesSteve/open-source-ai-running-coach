'use client';

import React from 'react';

/** Override so "Build to race day" bars are height-proportional for both new and legacy stored plans. */
const progressBarChartOverride = `
.plan-content .progress-grid { align-items: stretch !important; }
.plan-content .progress-bar-wrap { height: 100% !important; justify-content: flex-end !important; }
`;

function PlanView({ html, planId }: { html: string; planId: string }) {
  return (
    <div style={{ position: 'relative' }}>
      <style dangerouslySetInnerHTML={{ __html: progressBarChartOverride }} />
      <a
        href="/app/form"
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 10,
          padding: '8px 12px',
          background: '#262626',
          color: '#f5f5f5',
          borderRadius: 8,
          fontSize: '0.85rem',
          textDecoration: 'none',
        }}
      >
        New plan
      </a>
      <div
        className="plan-content"
        dangerouslySetInnerHTML={{ __html: html }}
        style={{ minHeight: '100vh' }}
      />
    </div>
  );
}

// Prevent re-renders when content unchanged so expanding a week doesn't reset the DOM
export default React.memo(PlanView, (prev, next) => prev.planId === next.planId && prev.html.length === next.html.length && prev.html === next.html);
