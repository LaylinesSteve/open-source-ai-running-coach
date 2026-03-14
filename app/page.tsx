import type { Metadata } from 'next';
import HomePage from '@/app/app/page';

export const metadata: Metadata = {
  title: 'Free Open Source Running Coach | Strava + AI Training Plans',
  description:
    'Free, open source running coach. Get personalized training plans from your goal, your date, and Strava. Create your plan for any distance—5K, marathon, or ultra. No cost, open source.',
  keywords: [
    'open source',
    'free running coach',
    'running coach',
    'training plan',
    'Strava',
    'marathon training',
    '5K training',
    'ultra running',
  ],
  openGraph: {
    title: 'Free Open Source Running Coach | Strava + AI Training Plans',
    description:
      'Free, open source running coach. Personalized training plans from your goal, your date, and Strava. Any distance—5K to ultra.',
    url: '/',
    siteName: 'Open Source AI Running Coach',
    images: [{ url: '/meta-image.png', width: 1200, height: 630, alt: 'Free open source running coach' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Open Source Running Coach | Strava + AI Training Plans',
    description:
      'Free, open source running coach. Personalized plans from your goal and Strava. 5K to ultra.',
    images: ['/meta-image.png'],
  },
};

export default function Page() {
  return <HomePage />;
}
