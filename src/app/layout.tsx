import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { Space_Grotesk, Instrument_Serif } from 'next/font/google';
import './globals.css';

// Space Grotesk → big display headings. Instrument Serif → hero numerals.
const grotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-grotesk',
  display: 'swap',
});
const instrument = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument',
  display: 'swap',
});

// Prefix static asset URLs with the deploy basePath (empty locally, the
// project path on GitHub Pages) so the manifest and icons resolve either way.
const bp = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata: Metadata = {
  title: 'Eagles Pickleball — Northcliff',
  description:
    'League nights, auto-matched 2v2, live leaderboard. Scan, pay R55, play all night. No codes, no slips.',
  manifest: `${bp}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Eagles',
  },
  icons: {
    icon: `${bp}/icon.svg`,
    apple: `${bp}/icon.svg`,
  },
};

export const viewport: Viewport = {
  themeColor: '#0A0A0B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${grotesk.variable} ${instrument.variable}`}
    >
      <body className="noise">{children}</body>
    </html>
  );
}
