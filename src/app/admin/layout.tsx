export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <head>
        <link rel="manifest" href="/manifest-admin.json" />
      </head>
      {children}
    </>
  )
}
