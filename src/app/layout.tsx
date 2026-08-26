import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

/* ── Fuentes — docs/design/glass-ledger-mockup.html ─────────────────────────
   Space Grotesk → display / títulos / brand name
   Inter         → UI general / body
   JetBrains Mono → montos, cifras, card numbers (tabular-nums)
──────────────────────────────────────────────────────────────────────────── */

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

/* ── Metadata ────────────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: {
    default: 'FinTrack',
    template: '%s — FinTrack',
  },
  description:
    'Monitorea tus tarjetas de crédito, registra gastos y sigue tus metas de ahorro. PWA con soporte offline.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FinTrack',
  },
};

export const viewport: Viewport = {
  themeColor: '#0F0A0B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

/* ── Layout raíz ─────────────────────────────────────────────────────────── */

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`
        ${spaceGrotesk.variable}
        ${inter.variable}
        ${jetbrainsMono.variable}
        h-full antialiased
      `}
    >
      <body className="min-h-full flex flex-col" style={{ backgroundColor: 'var(--bg-base)' }}>
        {children}
      </body>
    </html>
  );
}
