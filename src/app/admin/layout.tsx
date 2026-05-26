import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin — Kiosco Chatito',
  manifest: '/manifest-admin.json',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
