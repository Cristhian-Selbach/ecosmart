"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeftRight, CalendarX, CircleCheck, Info, Printer, SearchCheck, Share2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { InstitutionalFooter } from "@/components/shared/brand"
import { PatientHeader, PatientPageSkeleton, usePatientGuard } from "@/components/paciente/patient-shell"
import { PrepHighlight } from "@/components/paciente/prep-highlight"
import { TicketCard } from "@/components/paciente/ticket-card"
import { activeItems, consolidatedPrep, COLLECTION_ORDER } from "@/lib/rules"
import { useData } from "@/lib/store"
import { firstName, fmtDate } from "@/lib/format"
import type { ChangeReason, Exam } from "@/lib/types"

const PATIENT_REASON: Record<ChangeReason, string> = {
  escolha_errada: "exame escolhido incorretamente",
  indisponivel: "exame indisponível no momento",
  equivalente: "substituído por um exame equivalente",
  duplicado: "exame duplicado",
  outro: "ajuste da equipe da clínica",
}

export default function ComprovantePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const patient = usePatientGuard()
  const request = useData((s) => s.requests.find((r) => r.id === id))
  const allAppointments = useData((s) => s.appointments)
  const exams = useData((s) => s.exams)
  const cancelRequest = useData((s) => s.cancelRequest)

  const appointments = useMemo(
    () =>
      allAppointments
        .filter((a) => a.requestId === id)
        .sort((a, b) => COLLECTION_ORDER.indexOf(a.collection) - COLLECTION_ORDER.indexOf(b.collection)),
    [allAppointments, id],
  )

  useEffect(() => {
    if (request && (request.status === "pendente" || request.status === "em_analise")) router.replace(`/paciente/aguardando/${request.id}`)
  }, [request, router])

  if (!patient) return <PatientPageSkeleton />
  if (!request || request.patientId !== patient.id || appointments.length === 0)
    return (
      <>
        <PatientHeader back="/paciente/agendamentos" title="Comprovante" />
        <EmptyState
          icon={SearchCheck}
          title="Comprovante indisponível"
          description="Esta solicitação ainda não tem horário confirmado."
          action={
            <Button asChild size="lg">
              <Link href="/paciente/agendamentos">Meus agendamentos</Link>
            </Button>
          }
        />
      </>
    )

  const ex = (eid: string) => exams.find((e) => e.id === eid)
  const activeExams = activeItems(request).map((i) => ex(i.examId)).filter(Boolean) as Exam[]
  const prep = consolidatedPrep(activeExams)
  const changes = request.items.filter((i) => i.status !== "ativo")
  const cancelled = request.status === "cancelada"
  const upcoming = appointments.some((a) => a.status === "agendado")
  const first = appointments[0]

  const share = async () => {
    const text = `EcoSmart Saúde · Clínica LEAC\nProtocolo ${request.protocol}\n${appointments
      .map((a) => `${fmtDate(a.date)} às ${a.time} — ${a.room}`)
      .join("\n")}`
    try {
      if (navigator.share) await navigator.share({ title: "Comprovante de agendamento", text })
      else {
        await navigator.clipboard.writeText(text)
        toast.success("Comprovante copiado", { description: "Cole no WhatsApp ou onde preferir." })
      }
    } catch {
      /* usuário cancelou */
    }
  }

  return (
    <>
      <PatientHeader back="/paciente/agendamentos" title="Comprovante" />
      <main className="flex-1 space-y-5 px-5 pt-5 pb-8">
        {cancelled ? (
          <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-red-900 ring-1 ring-red-100 animate-enter">
            <CalendarX className="size-6 shrink-0" />
            <p className="text-[15px] font-medium">Este agendamento foi cancelado.</p>
          </div>
        ) : (
          <div className="flex items-center gap-3 animate-enter">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-eco text-white">
              <CircleCheck className="size-6" />
            </span>
            <div>
              <h1 className="font-heading text-xl leading-tight font-bold text-ink">Tudo certo, {firstName(patient.name)}!</h1>
              <p className="text-[15px] text-subtle">
                {appointments.length > 1 ? `Você tem ${appointments.length} horários confirmados.` : "Seu horário está confirmado."}
              </p>
            </div>
          </div>
        )}

        {changes.length > 0 && (
          <div className="rounded-2xl bg-brand-soft/70 p-4 ring-1 ring-blue-100 animate-enter">
            <p className="flex items-center gap-2 text-sm font-semibold text-navy">
              <Info className="size-4" /> Seu pedido foi ajustado pela equipe
            </p>
            <ul className="mt-2 space-y-2">
              {changes.map((c) => {
                const from = ex(c.examId)
                const to = c.replacedBy ? ex(request.items.find((i) => i.id === c.replacedBy)?.examId ?? "") : undefined
                const fromName = from?.sensitive ? "Exame confidencial" : from?.name
                const toName = to?.sensitive ? "Exame confidencial" : to?.name
                return (
                  <li key={c.id} className="text-[15px] leading-snug text-ink/85">
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <span className="text-subtle line-through">{fromName}</span>
                      {to ? (
                        <>
                          <ArrowLeftRight className="size-3.5 text-subtle" aria-label="trocado por" />
                          <strong className="font-semibold text-ink">{toName}</strong>
                        </>
                      ) : (
                        <span className="text-subtle">(removido)</span>
                      )}
                    </span>
                    <span className="block text-sm text-subtle">
                      Motivo: {c.reason === "outro" && c.reasonNote ? c.reasonNote : c.reason ? PATIENT_REASON[c.reason] : "—"}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {appointments.map((a) => (
          <TicketCard
            key={a.id}
            request={request}
            appointment={a}
            patient={patient}
            exams={a.examIds.map(ex).filter(Boolean) as Exam[]}
          />
        ))}

        <PrepHighlight prep={prep} title="Preparo para o dia" />

        <div className="no-print grid grid-cols-2 gap-3">
          <Button variant="outline" size="xl" onClick={() => window.print()}>
            <Printer /> Salvar
          </Button>
          <Button variant="outline" size="xl" onClick={share}>
            <Share2 /> Compartilhar
          </Button>
        </div>

        {upcoming && !cancelled && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="xl" className="no-print w-full text-red-700 hover:bg-red-50 hover:text-red-800">
                <CalendarX /> Cancelar agendamento
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-heading text-xl">Cancelar agendamento?</AlertDialogTitle>
                <AlertDialogDescription className="text-base">
                  Seu horário de {fmtDate(first.date)} às {first.time}
                  {appointments.length > 1 ? " e os demais deste protocolo" : ""} será liberado para outra pessoa. Essa ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel className="h-12 text-base">Manter horário</AlertDialogCancel>
                <AlertDialogAction
                  className="h-12 bg-red-600 text-base text-white hover:bg-red-700"
                  onClick={() => {
                    cancelRequest(request.id, "paciente")
                    toast.success("Agendamento cancelado", { description: "O horário foi liberado." })
                  }}
                >
                  Sim, cancelar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        <InstitutionalFooter compact className="no-print" />
      </main>
    </>
  )
}
