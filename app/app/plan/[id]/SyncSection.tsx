import AddRunButton from './AddRunButton';
import AdaptButton from './AdaptButton';
import SyncButton from './SyncButton';

type SyncResult = {
  completed: { weekNum: number; dayLabel: string; planned: string; actualMi: number; date: string }[];
  totalPlanned: number;
  totalCompleted: number;
  summary: string;
};

export default function SyncSection({
  planId,
  hasWeeksData,
  hasStrava,
  lastSyncAt,
  syncResult,
}: {
  planId: string;
  hasWeeksData: boolean;
  hasStrava: boolean;
  lastSyncAt?: string;
  syncResult?: SyncResult | null;
}) {
  if (!hasWeeksData) return null;

  const sectionStyle = {
    maxWidth: 720,
    margin: '0 auto',
    padding: '2rem 1.5rem',
    background: '#141414',
    borderTop: '1px solid #262626',
  };

  return (
    <section style={sectionStyle}>
      <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#e85d04', marginBottom: '0.5rem' }}>
        Training log
      </p>
      <p style={{ color: '#a3a3a3', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Sync Strava (all activity types; weekly totals use runs) or add runs manually.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
        {hasStrava && <SyncButton planId={planId} />}
        <AddRunButton planId={planId} />
        <AdaptButton planId={planId} />
      </div>
      {lastSyncAt && syncResult && (
        <p style={{ marginTop: '1rem', color: '#737373', fontSize: '0.85rem' }}>
          Last synced: {new Date(lastSyncAt).toLocaleDateString()}. {syncResult.summary}
        </p>
      )}
    </section>
  );
}
