import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kiosco Chatito — Pedidos online por WhatsApp',
  description: 'Pedí al kiosco de barrio: bebidas, golosinas, cigarrillos y más. Te respondemos a la brevedad por WhatsApp.',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
    shortcut: '/logo.png',
  },
  openGraph: {
    title: 'Kiosco Chatito',
    description: 'Pedí al kiosco de barrio y te respondemos por WhatsApp. Bebidas, golosinas, cigarrillos y más.',
    url: 'https://kioscochatito.com',
    siteName: 'Kiosco Chatito',
    images: [{ url: 'https://kioscochatito.com/logo.png', width: 500, height: 500, alt: 'Logo Kiosco Chatito' }],
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Kiosco Chatito',
    description: 'Pedí al kiosco de barrio y te respondemos por WhatsApp.',
    images: ['https://kioscochatito.com/logo.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <meta name="theme-color" content="#CC0000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Chatito" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="icon" type="image/png" href="/logo.png" />
        {/* Captura beforeinstallprompt antes de que React hidrate para no perder el evento */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__pwaInstallPrompt=e});`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
