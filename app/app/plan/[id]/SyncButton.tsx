'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type AdaptationPayload =
  | { ok: true }
  | { ok: false; error?: string; skipped?: string };

type RebalancePayload =
  | { status: 'updated'; weekNum: number; note: string }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string };

/** What the last sync has to tell the athlete. "updated" notes fade on their own; problems stay until dismissed. */
type Notice = { tone: 'updated' | 'warn' | 'error'; title: string; text?: string };

const UPDATED_NOTICE_MS = 15000;

export default function SyncButton({
  planId,
  variant = 'primary',
  embedded = false,
}: {
  planId: string;
  variant?: 'primary' | 'sticky';
  /** When true with sticky variant, omit fixed positioning (parent bar handles layout). */
  embedded?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const isSticky = variant === 'sticky';

  useEffect(() => {
    if (notice?.tone !== 'updated') return;
    const t = setTimeout(() => setNotice(null), UPDATED_NOTICE_MS);
    return () => clearTimeout(t);
  }, [notice]);

  const runSync = async () => {
    setNotice(null);
    setLoading(true);
    try {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const res = await fetch(`/api/plan/${planId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ today }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ tone: 'error', title: data.error || 'Sync failed' });
        setLoading(false);
        return;
      }
      const adaptation = data.adaptation as AdaptationPayload | undefined;
      const rebalance = data.rebalance as RebalancePayload | undefined;
      if (rebalance?.status === 'updated') {
        setNotice({ tone: 'updated', title: `Week ${rebalance.weekNum} adjusted`, text: rebalance.note || undefined });
      } else if (rebalance?.status === 'failed') {
        setNotice({ tone: 'warn', title: 'Synced, but this week wasn’t adjusted', text: rebalance.error });
      } else if (adaptation && !adaptation.ok && adaptation.error) {
        setNotice({ tone: 'warn', title: 'Synced, but coach advice didn’t refresh', text: adaptation.error });
      }
      router.refresh();
    } catch {
      setNotice({ tone: 'error', title: 'Something went wrong' });
    }
    setLoading(false);
  };

  const button = (
    <button
      type="button"
      onClick={runSync}
      disabled={loading}
      className={isSticky ? 'plan-sync-strava-sticky' : undefined}
      style={
        isSticky
          ? {
              cursor: loading ? 'not-allowed' : 'pointer',
            }
          : {
              padding: '12px 24px',
              background: '#e85d04',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
            }
      }
    >
      {loading ? '…' : isSticky ? 'Sync' : 'Update with recent Strava training'}
    </button>
  );

  if (isSticky) {
    const content = (
      <>
        {button}
        {notice && (
          <div
            className={`plan-sync-toast plan-sync-toast--${notice.tone}`}
            role={notice.tone === 'error' ? 'alert' : 'status'}
          >
            <p className="plan-sync-toast-title">{notice.title}</p>
            {notice.text && <p className="plan-sync-toast-text">{notice.text}</p>}
            <button
              type="button"
              className="plan-sync-toast-close"
              aria-label="Dismiss"
              onClick={() => setNotice(null)}
            >
              ×
            </button>
          </div>
        )}
      </>
    );
    if (embedded) return <div className="plan-sticky-actions-item">{content}</div>;
    return (
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 10 }}>
        {content}
      </div>
    );
  }

  return (
    <div>
      {button}
      {notice && (
        <p
          style={{
            color: notice.tone === 'error' ? '#e85d04' : '#a3a3a3',
            marginTop: '0.5rem',
            fontSize: notice.tone === 'error' ? '0.9rem' : '0.85rem',
          }}
        >
          {notice.text ? `${notice.title}: ${notice.text}` : notice.title}
        </p>
      )}
    </div>
  );
}
