'use client';

import { useState } from 'react';
import type { CoachChatMessage } from '@/lib/store';
import CoachChatModal from './CoachChatModal';

export default function CoachChatButton({
  planId,
  initialHistory = [],
}: {
  planId: string;
  initialHistory?: CoachChatMessage[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-block',
          padding: '12px 20px',
          background: 'transparent',
          border: '1px solid #e85d04',
          color: '#e85d04',
          fontWeight: 600,
          borderRadius: 8,
          fontSize: '0.9rem',
          cursor: 'pointer',
        }}
      >
        Talk to your coach
      </button>
      {open && (
        <CoachChatModal
          planId={planId}
          initialHistory={initialHistory}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
