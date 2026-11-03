"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { CalendarClock, CalendarX, CircleCheck, ExternalLink, Phone, UserCheck, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { CollectionBadge, SensitiveName } from "@/components/shared/exam-chip"
import { SlotCard } from "@/components/shared/slot-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { Timeline } from "@/components/shared/timeline-item"
import { COLLECTION_META } from "@/lib/mock-data"
import { slotsForDay, upcomingBusinessDates } from "@/lib/rules"
import { useCurrentStaff, useData } from "@/lib/store"
import { ageFrom, fmtDateShort, fmtLongDate, fmtWeekdayShort, formatPhone } from "@/lib/format"
import { cn } from "@/lib/utils"

export function AppointmentSheet({ appointmentId, onClose }: { appointmentId?: string; onClose: () => void }) {
  const staff = useCurrentStaff()!
  const appt = useData((s) => s.appointments.find((a) => a.id === appointmentId))
  const appointments = useData((s) => s.appointments)
  const patient = useData((s) => s.patients.find((p) => p.id === appt?.patientId))
  const request = useData((s) => s.requests.find((r) => r.id === appt?.requestId))
  const exams = useData((s) => s.exams)
  const { setAppointmentStatus, rescheduleAppointment } = useData.getState()
  const [rescheduling, setRescheduling] = useState(false)
  const dates = useMemo(() => upcomingBusinessDates(), [])
  const [date, setDate] = useState<string>()

  const act = (status: "checkin" | "concluido" | "faltou" | "cancelado" | "agendado", msg: string) => {
    if (!appt) return
    setAppointmentStatus(appt.id, status, staff.id)
    toast.success(msg, { description: patient?.name })
  }

  return (
    <Sheet
      open={!!appointmentId}
      onOpenChange={(v) => {
        if (!v) {
          setRescheduling(false)
          setDate(undefined)
          onClose()
        }
      }}
    >
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        {appt && patient && request && (
          <>
            <SheetHeader className="border-b border-line p-6">
              <div className="flex items-center gap-2">
                <CollectionBadge collection={appt.collection} />
                <StatusBadge status={appt.status} />
              </div>
              <SheetTitle className="mt-2 font-heading text-2xl">{patient.name}</SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-x-3 text-sm">
                <span>{ageFrom(patient.birthDate)} anos</span>
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3.5" />
                  {formatPhone(patient.phone)}
                </span>
                <span className="font-mono text-xs">{request.protocol}</span>
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 p-6">
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-canvas p-4">
                <div>
                  <p className="text-xs text-subtle">Data</p>
                  <p className="font-semibold text-ink capitalize">{fmtLongDate(appt.date)}</p>
                </div>
                <div>
                  <p className="text-xs text-subtle">{appt.collection === "sangue" ? "Horário" : "Janela"}</p>
                  <p className="font-semibold text-ink">
                    {appt.time}
                    {appt.collection !== "sangue" && `–${appt.endTime}`}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-subtle">Local</p>
                  <p className="font-semibold text-ink">{appt.room} · Clínica LEAC</p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-bold text-ink">Exames ({appt.examIds.length})</p>
                <ul className="space-y-1.5">
                  {appt.examIds.map((id) => {
                    const e = exams.find((x) => x.id === id)
                    return e ? (
                      <li key={id} className="flex items-center gap-2 text-sm">
                        <span className="size-1.5 rounded-full bg-eco" />
                        <SensitiveName exam={e} compact />
                      </li>
                    ) : null
                  })}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {appt.status === "agendado" && (
                  <Button variant="eco" size="lg" onClick={() => act("checkin", "Check-in realizado")}>
                    <UserCheck /> Check-in
                  </Button>
                )}
                {appt.status === "checkin" && (
                  <Button variant="eco" size="lg" onClick={() => act("concluido", `${COLLECTION_META[appt.collection].action} concluída`)}>
                    <CircleCheck /> Concluir
                  </Button>
                )}
                {(appt.status === "agendado" || appt.status === "checkin") && (
                  <>
                    <Button variant="outline" size="lg" onClick={() => act("faltou", "Falta registrada")}>
                      <UserX /> Marcar falta
                    </Button>
                    <Button variant="outline" size="lg" onClick={() => setRescheduling((v) => !v)} className={cn(rescheduling && "border-brand bg-brand-soft")}>
                      <CalendarClock /> Remarcar
                    </Button>
                    <Button variant="ghost" size="lg" className="text-red-700 hover:bg-red-50" onClick={() => act("cancelado", "Agendamento cancelado")}>
                      <CalendarX /> Cancelar
                    </Button>
                  </>
                )}
                {(appt.status === "faltou" || appt.status === "cancelado") && (
                  <Button variant="outline" size="lg" className="col-span-2" onClick={() => setRescheduling((v) => !v)}>
                    <CalendarClock /> Remarcar
                  </Button>
                )}
              </div>

              {rescheduling && (
                <div className="space-y-3 rounded-2xl border border-brand/30 bg-brand-soft/30 p-4 animate-enter">
                  <p className="text-sm font-bold text-ink">Escolha o novo horário</p>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    {dates.map((d) => (
                      <button
                        key={d}
                        onClick={() => setDate(d)}
                        className={cn(
                          "flex min-w-14 flex-col items-center rounded-xl border bg-white px-2 py-1.5 text-xs transition-colors",
                          d === (date ?? dates[0]) ? "border-navy bg-navy text-white" : "border-line hover:border-brand/40",
                        )}
                      >
                        <span className="capitalize">{fmtWeekdayShort(d)}</span>
                        <span className="font-heading text-sm font-bold">{fmtDateShort(d)}</span>
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {slotsForDay(appt.collection, date ?? dates[0], appointments, appt.id).map((s) => {
                      const past = new Date(`${s.date}T${s.time}:00`).getTime() < Date.now() + 30 * 60_000
                      return (
                        <SlotCard
                          key={s.time}
                          slot={s}
                          showDate={false}
                          disabled={past}
                          selected={s.date === appt.date && s.time === appt.time}
                          onSelect={() => {
                            rescheduleAppointment(appt.id, s.date, s.time, staff.id)
                            toast.success("Agendamento remarcado", { description: `${fmtDateShort(s.date)} às ${s.time}` })
                            setRescheduling(false)
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-ink">Linha do tempo</p>
                  <Link href={`/equipe/fila?id=${request.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                    Abrir solicitação <ExternalLink className="size-3" />
                  </Link>
                </div>
                <Timeline events={request.events} newestFirst />
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
