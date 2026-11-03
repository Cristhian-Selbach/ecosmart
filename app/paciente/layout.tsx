export default function PacienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,_#e7f7f4_0%,_#f6f9fc_45%)] text-base sm:py-6">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background sm:min-h-[calc(100dvh-3rem)] sm:overflow-hidden sm:rounded-[2rem] sm:shadow-lift sm:ring-1 sm:ring-line">
        {children}
      </div>
    </div>
  )
}
