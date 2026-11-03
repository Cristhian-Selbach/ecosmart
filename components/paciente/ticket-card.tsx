"use client"

import { QRCodeSVG } from "qrcode.react"
import { CalendarDays, Clock, DoorOpen, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { COLLECTION_META, CLINIC } from "@/lib/mock-data"
import { fmtDate, fmtLongDate, maskCPF } from "@/lib/format"
import type { Appointment, Exam, ExamRequest, Patient } from "@/lib/types"
import { CollectionIcon, SensitiveName } from "@/components/shared/exam-chip"
import { StatusBadge } from "@/components/shared/status-badge"
import { BrandMark } from "@/components/shared/brand"

export function TicketCard({
  request,
  appointment,
  patient,
  exams,
  className,
}: {
  request: ExamRequest
  appointment: Appointment
  patient: Patient
  exams: Exam[]
  className?: string
}) {
  const meta = COLLECTION_META[appointment.collection]
  const isWindow = appointment.collection !== "sangue"
  const cancelled = appointment.status === "cancelado"
  return (
    <article
      className={cn("relative overflow-hidden rounded-3xl bg-white shadow-lift ring-1 ring-line animate-enter", cancelled && "opacity-70", className)}
      aria-label={`Comprovante ${meta.label}`}
    >
      {/* Cabeçalho */}
      <div className="relative bg-gradient-to-br from-navy via-navy to-brand px-5 pt-5 pb-6 text-white">
        <div className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-eco/25 blur-2xl" aria-hidden />
        <div className="relative flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <BrandMark size={26} />
            EcoSmart Saúde
          </span>
          {appointment.status !== "agendado" && <StatusBadge status={appointment.status} className="bg-white" />}
        </div>
        <div className="relative mt-5 flex items-center gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <CollectionIcon collection={appointment.collection} className="size-5" />
          </span>
          <div>
            <p className="text-xs font-medium tracking-wide text-white/70 uppercase">{isWindow ? "Entrega de amostra" : "Coleta"}</p>
            <p className="font-heading text-xl font-bold">{meta.label}</p>
          </div>
        </div>
      </div>

      {/* Dados principais */}
      <div className="grid grid-cols-2 gap-4 px-5 pt-5 pb-4">
        <Field icon={CalendarDays} label="Data" value={fmtDate(appointment.date)} hint={fmtLongDate(appointment.date)} />
        <Field
          icon={Clock}
          label={isWindow ? "Janela de entrega" : "Horário"}
          value={isWindow ? `${appointment.time}–${appointment.endTime}` : appointment.time}
          hint={isWindow ? "Chegue em qualquer horário da janela" : "Chegue 10 min antes"}
        />
        <Field icon={DoorOpen} label="Sala" value={appointment.room} />
        <Field icon={MapPin} label="Local" value={CLINIC.name} hint="Campus Ecoville" />
      </div>

      {/* Picote */}
      <div className="relative my-1 h-6" aria-hidden>
        <span className="absolute top-1/2 -left-3 size-6 -translate-y-1/2 rounded-full bg-background ring-1 ring-line" />
        <span className="absolute top-1/2 -right-3 size-6 -translate-y-1/2 rounded-full bg-background ring-1 ring-line" />
        <span className="absolute top-1/2 right-5 left-5 border-t-2 border-dashed border-line" />
      </div>

      {/* QR + protocolo */}
      <div className="flex items-center gap-4 px-5 pt-3 pb-5">
        <div className="rounded-2xl bg-white p-2 ring-1 ring-line">
          <QRCodeSVG
            value={`ECOSMART|${request.protocol}|${appointment.id}`}
            size={104}
            fgColor="#0B3B6E"
            level="M"
            aria-label={`QR Code do protocolo ${request.protocol}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium tracking-wide text-subtle uppercase">Protocolo</p>
          <p className="font-mono text-lg font-bold tracking-tight text-navy">{request.protocol}</p>
          <p className="mt-2 truncate text-sm font-medium text-ink">{patient.name}</p>
          <p className="text-xs text-subtle">CPF {maskCPF(patient.cpf)}</p>
        </div>
      </div>

      <div className="border-t border-line bg-canvas/60 px-5 py-4">
        <p className="mb-2 text-xs font-semibold tracking-wide text-subtle uppercase">
          {exams.length} {exams.length === 1 ? "exame" : "exames"} {appointment.collection === "sangue" && exams.length > 1 && "· uma única coleta"}
        </p>
        <ul className="space-y-1.5">
          {exams.map((e) => (
            <li key={e.id} className="flex items-center gap-2 text-[15px] text-ink">
              <span className="size-1.5 shrink-0 rounded-full bg-eco" aria-hidden />
              <SensitiveName exam={e} />
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}

function Field({ icon: Icon, label, value, hint }: { icon: typeof Clock; label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-xs font-medium text-subtle">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </p>
      <p className="mt-0.5 font-heading text-base leading-tight font-bold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-subtle first-letter:uppercase">{hint}</p>}
    </div>
  )
}
