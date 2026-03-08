'use client';

import React from 'react';

function PlanView({ html, planId }: { html: string; planId: string }) {
  return (
    <div style={{ position: 'relative' }}>
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
        dangerouslySetInnerHTML={{ __html: html }}
        style={{ minHeight: '100vh' }}
      />
    </div>
  );
}

// Prevent re-renders when content unchanged so expanding a week doesn't reset the DOM
export default React.memo(PlanView, (prev, next) => prev.planId === next.planId && prev.html.length === next.html.length && prev.html === next.html);
