import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kiosco Chatito',
  description: 'Pedí tus productos y recibí por WhatsApp',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#CC0000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Chatito" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/logo.png" />
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
