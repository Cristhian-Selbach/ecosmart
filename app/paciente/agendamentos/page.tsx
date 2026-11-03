"use client"

import { useMemo } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { CalendarHeart, ChevronRight, Clock, Plus, QrCode } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { InstitutionalFooter } from "@/components/shared/brand"
import { CollectionIcon } from "@/components/shared/exam-chip"
import { StatusBadge } from "@/components/shared/status-badge"
import { Greeting, PatientHeader, PatientPageSkeleton, usePatientGuard } from "@/components/paciente/patient-shell"
import { COLLECTION_META } from "@/lib/mock-data"
import { activeExamIds } from "@/lib/rules"
import { useData } from "@/lib/store"
import { fmtDateShort, fmtWeekdayShort, timeAgo, toDate } from "@/lib/format"
import { useNow } from "@/lib/hooks"
import type { Appointment, ExamRequest } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function AgendamentosPage() {
  const patient = usePatientGuard()
  const requests = useData((s) => s.requests)
  const appointments = useData((s) => s.appointments)
  const exams = useData((s) => s.exams)
  useNow(30_000)

  const { waiting, upcoming, past } = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd")
    const mine = requests.filter((r) => r.patientId === patient?.id)
    const withAppts = (r: ExamRequest) => appointments.filter((a) => a.requestId === r.id).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    const waiting = mine.filter((r) => r.status === "pendente" || r.status === "em_analise")
    const upcoming = mine
      .filter((r) => r.status === "agendada" && withAppts(r).some((a) => a.date >= today && ["agendado", "checkin"].includes(a.status)))
      .map((r) => ({ r, appts: withAppts(r) }))
      .sort((a, b) => (a.appts[0].date + a.appts[0].time).localeCompare(b.appts[0].date + b.appts[0].time))
    const upIds = new Set(upcoming.map((u) => u.r.id))
    const past = mine
      .filter((r) => !waiting.includes(r) && !upIds.has(r.id))
      .map((r) => ({ r, appts: withAppts(r) }))
      .sort((a, b) => (b.appts[0]?.date ?? b.r.createdAt).localeCompare(a.appts[0]?.date ?? a.r.createdAt))
    return { waiting, upcoming, past }
  }, [requests, appointments, patient?.id])

  if (!patient) return <PatientPageSkeleton />
  const examLabel = (r: ExamRequest) => {
    const ids = activeExamIds(r)
    const names = ids.map((id) => exams.find((e) => e.id === id)).map((e) => (e?.sensitive ? "Exame confidencial" : e?.name))
    return names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ")
  }
  const empty = !waiting.length && !upcoming.length && !past.length

  return (
    <>
      <PatientHeader />
      <main className="flex-1 space-y-7 px-5 pt-6 pb-6">
        <div>
          <Greeting name={patient.name} />
          <h1 className="mt-0.5 font-heading text-[26px] font-bold text-ink">Meus agendamentos</h1>
        </div>

        <Link
          href="/paciente/solicitar"
          className="group relative flex items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-navy to-brand p-5 text-white shadow-lift transition-transform duration-200 hover:-translate-y-0.5"
        >
          <span className="pointer-events-none absolute -right-8 -bottom-10 size-36 rounded-full bg-eco/30 blur-2xl" aria-hidden />
          <span className="relative inline-flex size-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <Plus className="size-6" />
          </span>
          <span className="relative flex-1">
            <span className="block font-heading text-lg font-bold">Solicitar exames</span>
            <span className="block text-sm text-white/75">Escolha os exames e sua preferência de horário</span>
          </span>
          <ChevronRight className="relative size-5 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>

        {empty && (
          <EmptyState
            icon={CalendarHeart}
            title="Nenhum agendamento ainda"
            description="Quando você solicitar exames, eles aparecerão aqui com o status e o comprovante."
          />
        )}

        {waiting.length > 0 && (
          <Section title="Aguardando confirmação">
            {waiting.map((r) => (
              <Link
                key={r.id}
                href={`/paciente/aguardando/${r.id}`}
                className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 transition-all hover:shadow-soft"
              >
                <span className="relative inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-700 ring-1 ring-amber-200">
                  <Clock className="size-5" />
                  <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-amber-400 ring-2 ring-white animate-pulse" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold text-ink">{examLabel(r)}</span>
                  <span className="block text-sm text-subtle">Enviada {timeAgo(r.createdAt)} · {r.protocol}</span>
                </span>
                <StatusBadge status={r.status} />
              </Link>
            ))}
          </Section>
        )}

        {upcoming.length > 0 && (
          <Section title="Próximos">
            {upcoming.map(({ r, appts }) => (
              <AppointmentCard key={r.id} request={r} appts={appts} label={examLabel(r)} />
            ))}
          </Section>
        )}

        {past.length > 0 && (
          <Section title="Anteriores">
            {past.map(({ r, appts }) => (
              <AppointmentCard key={r.id} request={r} appts={appts} label={examLabel(r)} muted />
            ))}
          </Section>
        )}

        <InstitutionalFooter compact />
      </main>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-bold tracking-wide text-subtle uppercase">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function AppointmentCard({ request, appts, label, muted }: { request: ExamRequest; appts: Appointment[]; label: string; muted?: boolean }) {
  const first = appts[0]
  const status = request.status !== "agendada" ? request.status : (first?.status ?? "agendado")
  const href = appts.length ? `/paciente/comprovante/${request.id}` : `/paciente/aguardando/${request.id}`
  return (
    <Link href={href} className={cn("flex items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-soft transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lift", muted && "bg-white/70 shadow-none")}>
      {first ? (
        <span className={cn("flex w-14 shrink-0 flex-col items-center rounded-2xl py-2", muted ? "bg-slate-100 text-slate-600" : "bg-eco-soft text-eco-strong")}>
          <span className="text-xs font-semibold capitalize">{fmtWeekdayShort(first.date)}</span>
          <span className="font-heading text-2xl leading-none font-bold">{format(toDate(first.date), "dd")}</span>
          <span className="text-xs font-medium">{fmtDateShort(first.date).slice(3)}</span>
        </span>
      ) : (
        <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <CalendarHeart className="size-6" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-subtle">
          {appts.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-1">
              <CollectionIcon collection={a.collection} className="size-3.5" />
              {a.time}
              <span className="sr-only">{COLLECTION_META[a.collection].label}</span>
            </span>
          ))}
        </span>
        <span className="block truncate text-base font-semibold text-ink">{label}</span>
        <span className="mt-1 flex items-center gap-2">
          <StatusBadge status={status} />
          {!muted && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-brand">
              <QrCode className="size-3.5" /> Comprovante
            </span>
          )}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-subtle" />
    </Link>
  )
}
