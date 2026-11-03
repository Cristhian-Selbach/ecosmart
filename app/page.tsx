"use client"

import Link from "next/link"
import { ArrowRight, HeartPulse, RotateCcw, ShieldCheck, Smartphone, Monitor, Stethoscope } from "lucide-react"
import { toast } from "sonner"
import { InstitutionalFooter, Wordmark } from "@/components/shared/brand"
import { useData } from "@/lib/store"

export default function Home() {
  const reset = useData((s) => s.reset)
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-40 -left-32 size-[520px] rounded-full bg-eco-soft blur-3xl" />
        <div className="absolute -right-40 -bottom-40 size-[560px] rounded-full bg-brand-soft blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-5 py-12">
        <Wordmark size={48} tagline className="animate-enter" />

        <h1 className="mt-10 text-center font-heading text-3xl font-bold text-ink sm:text-4xl">Como você quer entrar?</h1>
        <p className="mt-2 max-w-md text-center text-base text-subtle">
          Exames gratuitos na Clínica LEAC, realizados por estudantes de enfermagem e medicina com supervisão de preceptores.
        </p>

        <div className="mt-8 grid w-full gap-4 sm:grid-cols-2">
          <EntryCard
            href="/paciente/entrar"
            icon={HeartPulse}
            title="Sou paciente"
            description="Solicite exames e acompanhe seus agendamentos pelo celular."
            hint={<><Smartphone className="size-3.5" /> Pensado para celular</>}
            tone="eco"
          />
          <EntryCard
            href="/equipe/entrar"
            icon={Stethoscope}
            title="Sou da equipe"
            description="Fila de solicitações, agenda, pacientes e indicadores da clínica."
            hint={<><Monitor className="size-3.5" /> Pensado para computador</>}
            tone="navy"
          />
        </div>

        <p className="mt-6 inline-flex items-center gap-1.5 text-sm text-subtle">
          <ShieldCheck className="size-4 text-eco-strong" aria-hidden />
          Seus dados são protegidos conforme a LGPD.
        </p>
      </div>

      <div className="relative">
        <InstitutionalFooter />
        <div className="pb-5 text-center">
          <button
            onClick={() => {
              reset()
              toast.success("Dados da demonstração reiniciados")
            }}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-subtle transition-colors hover:text-navy"
          >
            <RotateCcw className="size-3.5" aria-hidden /> Reiniciar dados da demo
          </button>
        </div>
      </div>
    </main>
  )
}

function EntryCard({
  href,
  icon: Icon,
  title,
  description,
  hint,
  tone,
}: {
  href: string
  icon: typeof HeartPulse
  title: string
  description: string
  hint: React.ReactNode
  tone: "eco" | "navy"
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col rounded-3xl border border-line bg-white p-6 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:border-transparent hover:shadow-lift focus-visible:-translate-y-1"
    >
      <span
        className={
          tone === "eco"
            ? "inline-flex size-14 items-center justify-center rounded-2xl bg-eco-soft text-eco-strong"
            : "inline-flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-navy"
        }
      >
        <Icon className="size-7" aria-hidden />
      </span>
      <span className="mt-5 font-heading text-2xl font-bold text-ink">{title}</span>
      <span className="mt-1.5 text-base text-subtle">{description}</span>
      <span className="mt-6 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-subtle">{hint}</span>
        <span
          className={
            tone === "eco"
              ? "inline-flex size-10 items-center justify-center rounded-full bg-eco text-white transition-transform duration-200 group-hover:translate-x-1"
              : "inline-flex size-10 items-center justify-center rounded-full bg-navy text-white transition-transform duration-200 group-hover:translate-x-1"
          }
        >
          <ArrowRight className="size-5" aria-hidden />
        </span>
      </span>
    </Link>
  )
}
