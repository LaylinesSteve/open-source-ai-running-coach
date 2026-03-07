'use client';

export default function PlanView({ html, planId }: { html: string; planId: string }) {
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
