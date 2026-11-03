"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Ban, CalendarCheck, Check, Clock, HeartHandshake, MessageCircle, SearchCheck, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { SensitiveName } from "@/components/shared/exam-chip"
import { PatientHeader, PatientPageSkeleton, usePatientGuard } from "@/components/paciente/patient-shell"
import { STAFF } from "@/lib/mock-data"
import { activeExamIds } from "@/lib/rules"
import { useData } from "@/lib/store"
import { timeAgo } from "@/lib/format"
import { useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"

export default function AguardandoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const patient = usePatientGuard()
  const request = useData((s) => s.requests.find((r) => r.id === id))
  const exams = useData((s) => s.exams)
  const prevStatus = useRef(request?.status)
  useNow(15_000)

  useEffect(() => {
    if (!request) return
    if (prevStatus.current && prevStatus.current !== request.status) {
      if (request.status === "em_analise") toast.info("Sua solicitação está em análise", { description: "Um atendente acabou de abrir seu pedido." })
    }
    prevStatus.current = request.status
    if (request.status === "agendada") {
      const t = setTimeout(() => router.push(`/paciente/comprovante/${request.id}`), 1800)
      return () => clearTimeout(t)
    }
  }, [request, router])

  if (!patient) return <PatientPageSkeleton />
  if (!request || request.patientId !== patient.id)
    return (
      <>
        <PatientHeader back="/paciente/agendamentos" />
        <EmptyState icon={SearchCheck} title="Solicitação não encontrada" description="Ela pode ter sido removida ou pertence a outro paciente." action={<Button asChild><Link href="/paciente/agendamentos">Meus agendamentos</Link></Button>} />
      </>
    )

  const step = request.status === "pendente" ? 1 : request.status === "em_analise" ? 2 : 3
  const scheduled = request.status === "agendada"
  const refused = request.status === "recusada" || request.status === "cancelada"
  const staff = STAFF.find((s) => s.id === request.assignedTo)
  const ids = activeExamIds(request)

  return (
    <>
      <PatientHeader back="/paciente/agendamentos" />
      <main className="flex flex-1 flex-col items-center px-6 pt-10 pb-8 text-center">
        {refused ? (
          <div className="animate-enter">
            <span className="mx-auto inline-flex size-20 items-center justify-center rounded-full bg-red-50 text-red-600 ring-8 ring-red-50/60">
              <Ban className="size-9" />
            </span>
            <h1 className="mt-6 font-heading text-2xl font-bold text-ink">
              {request.status === "recusada" ? "Não foi possível agendar" : "Solicitação cancelada"}
            </h1>
            {request.refusalReason && (
              <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-[15px] text-red-900 ring-1 ring-red-100">Motivo: {request.refusalReason}</p>
            )}
            <p className="mt-3 text-base text-subtle">Se tiver dúvidas, fale com a recepção da Clínica LEAC.</p>
            <Button asChild size="xl" className="mt-8 w-full">
              <Link href="/paciente/solicitar">Fazer nova solicitação</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="relative flex size-40 items-center justify-center" aria-hidden>
              {!scheduled && (
                <>
                  <span className="absolute inset-0 rounded-full bg-eco/25 animate-pulse-ring" />
                  <span className="absolute inset-0 rounded-full bg-eco/20 animate-pulse-ring [animation-delay:0.8s]" />
                  <span className="absolute inset-0 rounded-full bg-eco/15 animate-pulse-ring [animation-delay:1.6s]" />
                </>
              )}
              <span
                className={cn(
                  "relative inline-flex size-24 items-center justify-center rounded-full text-white shadow-lift transition-all duration-500",
                  scheduled ? "scale-110 bg-eco" : "bg-gradient-to-br from-eco to-brand",
                )}
              >
                {scheduled ? <Check className="size-12 animate-enter" strokeWidth={3} /> : <HeartHandshake className="size-11" />}
              </span>
            </div>

            <div aria-live="polite" className="mt-6">
              {scheduled ? (
                <>
                  <h1 className="font-heading text-2xl font-bold text-ink">Horário confirmado!</h1>
                  <p className="mt-2 text-base text-subtle">Abrindo seu comprovante…</p>
                </>
              ) : (
                <>
                  <h1 className="font-heading text-2xl leading-tight font-bold text-ink">Sua solicitação foi enviada</h1>
                  <p className="mx-auto mt-3 max-w-xs text-base leading-relaxed text-subtle">
                    {step === 2 && staff
                      ? `${staff.shortName}, da equipe da clínica, está analisando o seu pedido agora.`
                      : "Um atendente da clínica vai confirmar o seu horário."}
                  </p>
                </>
              )}
            </div>

            <ol className="mt-10 w-full max-w-xs space-y-0 text-left" aria-label="Andamento da solicitação">
              <Step icon={Send} label="Enviada" sub={timeAgo(request.createdAt)} state="done" />
              <Step icon={Clock} label="Em análise" sub={step >= 2 ? (staff ? `por ${staff.shortName}` : "pela equipe") : "aguardando atendente"} state={step > 2 ? "done" : step === 2 ? "current" : "todo"} />
              <Step icon={CalendarCheck} label="Agendada" sub={scheduled ? "pronto!" : "você será avisado aqui"} state={scheduled ? "done" : "todo"} last />
            </ol>

            <div className="mt-10 w-full rounded-2xl border border-line bg-white p-4 text-left">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold tracking-wide text-subtle uppercase">Protocolo</p>
                <p className="font-mono text-sm font-bold text-navy">{request.protocol}</p>
              </div>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {ids.map((eid) => {
                  const e = exams.find((x) => x.id === eid)
                  return e ? (
                    <li key={eid} className="rounded-full bg-canvas px-3 py-1.5 text-sm text-ink ring-1 ring-line">
                      <SensitiveName exam={e} compact />
                    </li>
                  ) : null
                })}
              </ul>
            </div>

            <p className="mt-6 flex items-center gap-2 text-sm text-subtle">
              <MessageCircle className="size-4 text-eco-strong" /> Você pode fechar esta tela. Avisaremos pelo WhatsApp.
            </p>
          </>
        )}
      </main>
    </>
  )
}

function Step({ icon: Icon, label, sub, state, last }: { icon: typeof Send; label: string; sub: string; state: "done" | "current" | "todo"; last?: boolean }) {
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0" aria-current={state === "current" ? "step" : undefined}>
      {!last && <span className={cn("absolute top-10 bottom-1 left-[19px] w-0.5 rounded-full", state === "done" ? "bg-eco" : "bg-line")} aria-hidden />}
      <span
        className={cn(
          "relative inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-all duration-300",
          state === "done" && "bg-eco text-white",
          state === "current" && "bg-white text-brand ring-2 ring-brand",
          state === "todo" && "bg-slate-100 text-slate-400",
        )}
      >
        {state === "done" ? <Check className="size-5" strokeWidth={3} /> : <Icon className="size-[18px]" />}
        {state === "current" && <span className="absolute inset-0 rounded-full ring-2 ring-brand animate-pulse-ring" aria-hidden />}
      </span>
      <div className="pt-1.5">
        <p className={cn("text-base font-semibold", state === "todo" ? "text-subtle" : "text-ink")}>{label}</p>
        <p className="text-sm text-subtle">{sub}</p>
      </div>
    </li>
  )
}
