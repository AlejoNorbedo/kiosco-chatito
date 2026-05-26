export default function EmpleadaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <head>
        <link rel="manifest" href="/manifest-empleada.json" />
      </head>
      {children}
    </>
  )
}
