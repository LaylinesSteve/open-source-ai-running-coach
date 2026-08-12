import { Suspense } from 'react';
import type { Metadata } from 'next';
import WeeklyPageClient from './WeeklyPageClient';

export const metadata: Metadata = {
  title: 'Weekly Strava Summary',
  description: 'Connect Strava and see your weekly mileage, pace, and elevation recap.',
};

export default function WeeklyPage() {
  return (
    <Suspense
      fallback={
        <p
          style={{
            margin: 0,
            padding: '80px 24px',
            textAlign: 'center',
            color: '#aeb0ac',
            background: '#08090b',
            minHeight: '60vh',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Loading…
        </p>
      }
    >
      <WeeklyPageClient />
    </Suspense>
  );
}
