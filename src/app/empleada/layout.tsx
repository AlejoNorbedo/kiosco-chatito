import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Empleadas — Kiosco Chatito',
  manifest: '/manifest-empleada.json',
}

export default function EmpleadaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
