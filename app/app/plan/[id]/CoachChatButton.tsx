'use client';

import { useState } from 'react';
import type { CoachChatMessage } from '@/lib/store';
import CoachChatModal from './CoachChatModal';

export default function CoachChatButton({
  planId,
  initialHistory = [],
  variant = 'primary',
}: {
  planId: string;
  initialHistory?: CoachChatMessage[];
  variant?: 'primary' | 'sticky';
}) {
  const [open, setOpen] = useState(false);
  const isSticky = variant === 'sticky';

  return (
    <>
      <button
        type="button"
        className={isSticky ? 'plan-coach-chat-sticky' : undefined}
        onClick={() => setOpen(true)}
        style={
          isSticky
            ? {
                padding: '8px 12px',
                background: '#0a0a0a',
                color: '#e85d04',
                border: '1px solid #e85d04',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                touchAction: 'manipulation',
                whiteSpace: 'nowrap',
              }
            : {
                display: 'inline-block',
                padding: '12px 20px',
                background: 'transparent',
                border: '1px solid #e85d04',
                color: '#e85d04',
                fontWeight: 600,
                borderRadius: 8,
                fontSize: '0.9rem',
                cursor: 'pointer',
                touchAction: 'manipulation',
              }
        }
      >
        {isSticky ? 'Coach' : 'Talk to your coach'}
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
