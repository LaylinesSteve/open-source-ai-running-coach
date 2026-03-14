import type { Metadata } from 'next';
import Footer from '@/app/components/Footer';

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Free Open Source Running Coach | Your race. Your plan.',
    template: '%s | Open Source AI Running Coach',
  },
  description:
    'Free, open source running coach. Personalized training plans from your goal, your date, and Strava. Create your plan for any distance. No cost.',
  openGraph: {
    title: 'Free Open Source Running Coach | Your race. Your plan.',
    description:
      'Free, open source running coach. Personalized training plans from your goal, your date, and Strava. Any distance.',
    url: baseUrl,
    siteName: 'Open Source AI Running Coach',
    images: [{ url: '/meta-image.png', width: 1200, height: 630, alt: 'Free open source running coach' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Open Source Running Coach | Your race. Your plan.',
    description: 'Free, open source running coach. Personalized plans from your goal and Strava.',
    images: ['/meta-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <main style={{ flex: 1 }}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
