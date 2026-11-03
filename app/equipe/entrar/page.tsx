"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, ArrowRight, CalendarCheck, LoaderCircle, ShieldCheck, Sparkles, Users } from "lucide-react"
import { InstitutionalFooter, PositivoLogo, Wordmark } from "@/components/shared/brand"
import { STAFF } from "@/lib/mock-data"
import { useSession } from "@/lib/store"
import { cn } from "@/lib/utils"

export default function EquipeEntrarPage() {
  const router = useRouter()
  const setStaff = useSession((s) => s.setStaff)
  const [loading, setLoading] = useState<string | null>(null)

  const enter = async (id: string) => {
    setLoading(id)
    await new Promise((r) => setTimeout(r, 500))
    setStaff(id)
    const u = STAFF.find((s) => s.id === id)!
    toast.success(`Olá, ${u.shortName}!`, { description: "Bom plantão na Clínica LEAC." })
    router.push("/equipe/fila")
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-eco/25 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-[28rem] rounded-full bg-brand/40 blur-3xl" aria-hidden />
        <Wordmark size={44} tagline light className="relative" />
        <div className="relative mt-auto max-w-md">
          <h2 className="font-heading text-4xl leading-tight font-bold">Menos fila. Mais cuidado.</h2>
          <p className="mt-3 text-lg text-white/75">
            Solicitações organizadas, alertas inteligentes e agenda por tipo de coleta — para a equipe focar no paciente.
          </p>
          <ul className="mt-8 space-y-3 text-white/85">
            {[
              [Sparkles, "Alertas automáticos de incompatibilidade e duplicidade"],
              [CalendarCheck, "Sugestão dos melhores horários em um clique"],
              [Users, "Atendimento por estudantes com supervisão de preceptores"],
            ].map(([Icon, t], i) => {
              const I = Icon as typeof Sparkles
              return (
                <li key={i} className="flex items-center gap-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                    <I className="size-4" />
                  </span>
                  {t as string}
                </li>
              )
            })}
          </ul>
        </div>
        <div className="relative mt-12 flex items-center gap-3 text-sm text-white/60">
          <span className="rounded-lg bg-white px-2 py-1">
            <PositivoLogo className="h-6" />
          </span>
          Clínica LEAC · Campus Ecoville
        </div>
      </aside>

      <section className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="inline-flex w-fit items-center gap-1.5 rounded-lg py-2 text-sm font-medium text-subtle hover:text-navy">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <Wordmark size={36} className="mb-8 lg:hidden" />
          <h1 className="font-heading text-3xl font-bold text-ink">Entrar na equipe</h1>
          <p className="mt-2 text-subtle">Escolha seu usuário para continuar.</p>

          <div className="mt-8 space-y-3">
            {STAFF.map((u) => (
              <button
                key={u.id}
                onClick={() => enter(u.id)}
                disabled={!!loading}
                className={cn(
                  "group flex w-full items-center gap-4 rounded-2xl border border-line bg-white p-4 text-left shadow-soft transition-all duration-150 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift disabled:opacity-60",
                  loading === u.id && "border-eco ring-2 ring-eco/25",
                )}
              >
                <span className="inline-flex size-12 items-center justify-center rounded-full font-heading text-base font-bold text-white" style={{ background: u.color }}>
                  {u.initials}
                </span>
                <span className="flex-1">
                  <span className="block font-heading text-base font-bold text-ink">{u.name}</span>
                  <span className="block text-sm text-subtle">{u.role}</span>
                </span>
                {loading === u.id ? (
                  <LoaderCircle className="size-5 animate-spin text-eco" />
                ) : (
                  <ArrowRight className="size-5 text-subtle transition-transform group-hover:translate-x-1 group-hover:text-navy" />
                )}
              </button>
            ))}
          </div>

          <p className="mt-6 flex items-center gap-2 rounded-xl bg-brand-soft/70 px-4 py-3 text-sm text-navy">
            <ShieldCheck className="size-4 shrink-0" /> Login simulado para demonstração. Nenhuma senha é necessária.
          </p>
        </div>
        <InstitutionalFooter compact />
      </section>
    </main>
  )
}
