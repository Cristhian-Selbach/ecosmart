"use client"

import { useMemo, useState } from "react"
import { addDays, format, isWeekend, parseISO, startOfWeek, subDays } from "date-fns"
import { CalendarOff, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CollectionIcon } from "@/components/shared/exam-chip"
import { EmptyState } from "@/components/shared/empty-state"
import { OccupancyBar } from "@/components/shared/slot-card"
import { statusDot } from "@/components/shared/status-badge"
import { AppointmentSheet } from "@/components/equipe/appointment-sheet"
import { COLLECTION_META } from "@/lib/mock-data"
import { COLLECTION_ORDER, slotsForDay } from "@/lib/rules"
import { useData } from "@/lib/store"
import { fmtDateShort, fmtLongDate, fmtWeekdayShort, initials } from "@/lib/format"
import type { Appointment, CollectionType, Patient } from "@/lib/types"
import { cn } from "@/lib/utils"

const iso = (d: Date) => format(d, "yyyy-MM-dd")
const nextBiz = (d: Date, dir: 1 | -1) => {
  let x = dir === 1 ? addDays(d, 1) : subDays(d, 1)
  while (isWeekend(x)) x = dir === 1 ? addDays(x, 1) : subDays(x, 1)
  return x
}
const todayBiz = () => {
  const t = new Date()
  return isWeekend(t) ? nextBiz(t, 1) : t
}

export default function AgendaPage() {
  const appointments = useData((s) => s.appointments)
  const patients = useData((s) => s.patients)
  const [view, setView] = useState<"dia" | "semana">("dia")
  const [date, setDate] = useState(() => iso(todayBiz()))
  const [filter, setFilter] = useState<CollectionType[]>(["sangue", "urina", "fezes"])
  const [openId, setOpenId] = useState<string>()

  const d = parseISO(date)
  const weekDays = useMemo(() => {
    const mon = startOfWeek(d, { weekStartsOn: 1 })
    return Array.from({ length: 5 }, (_, i) => iso(addDays(mon, i)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const visibleDates = view === "dia" ? [date] : weekDays
  const active = appointments.filter((a) => visibleDates.includes(a.date) && filter.includes(a.collection) && a.status !== "cancelado")
  const capacity = visibleDates.reduce((s, dt) => s + filter.reduce((t, c) => t + slotsForDay(c, dt, appointments).reduce((u, sl) => u + sl.capacity, 0), 0), 0)
  const stats = {
    total: active.length,
    checkin: active.filter((a) => a.status === "checkin" || a.status === "concluido").length,
    faltas: active.filter((a) => a.status === "faltou").length,
    ocupacao: capacity ? Math.round((active.length / capacity) * 100) : 0,
  }

  const move = (dir: 1 | -1) => setDate(iso(view === "dia" ? nextBiz(d, dir) : addDays(startOfWeek(d, { weekStartsOn: 1 }), dir * 7)))
  const toggleFilter = (c: CollectionType) =>
    setFilter((f) => (f.includes(c) ? (f.length > 1 ? f.filter((x) => x !== c) : f) : COLLECTION_ORDER.filter((x) => f.includes(x) || x === c)))
  const patientOf = (id: string) => patients.find((p) => p.id === id)

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Agenda</h1>
          <p className="text-sm text-subtle capitalize">
            {view === "dia" ? fmtLongDate(date) : `Semana de ${fmtDateShort(weekDays[0])} a ${fmtDateShort(weekDays[4])}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-white p-1 ring-1 ring-line" role="tablist" aria-label="Visualização">
            {(["dia", "semana"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={cn("h-8 rounded-lg px-4 text-sm font-semibold capitalize transition-colors", view === v ? "bg-navy text-white" : "text-subtle hover:text-ink")}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-white p-1 ring-1 ring-line">
            <Button variant="ghost" size="icon-sm" onClick={() => move(-1)} aria-label="Anterior">
              <ChevronLeft />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDate(iso(todayBiz()))}>
              Hoje
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => move(1)} aria-label="Próximo">
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {COLLECTION_ORDER.map((c) => {
            const on = filter.includes(c)
            return (
              <button
                key={c}
                onClick={() => toggleFilter(c)}
                aria-pressed={on}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-all",
                  on ? "border-navy bg-navy text-white" : "border-line bg-white text-subtle hover:text-ink",
                )}
              >
                <CollectionIcon collection={c} className="size-4" />
                {COLLECTION_META[c].label}
              </button>
            )
          })}
        </div>
        <div className="flex gap-2">
          <Stat label="Agendados" value={stats.total} />
          <Stat label="Atendidos" value={stats.checkin} />
          <Stat label="Faltas" value={stats.faltas} />
          <Stat label="Ocupação" value={`${stats.ocupacao}%`} />
        </div>
      </div>

      {view === "dia" ? (
        isWeekend(d) ? (
          <EmptyState icon={CalendarOff} title="Clínica fechada" description="Atendimentos de segunda a sexta." />
        ) : (
          <div className={cn("grid gap-4", filter.length === 3 ? "xl:grid-cols-[1.4fr_1fr_1fr]" : filter.length === 2 ? "xl:grid-cols-2" : "")}>
            {filter.map((c) => (
              <DayColumn key={c} collection={c} date={date} appointments={appointments} patientOf={patientOf} onOpen={setOpenId} />
            ))}
          </div>
        )
      ) : (
        <div className="grid grid-cols-5 gap-3">
          {weekDays.map((wd) => (
            <div key={wd} className={cn("min-w-0 rounded-2xl border bg-white shadow-soft", wd === iso(new Date()) ? "border-eco ring-2 ring-eco/20" : "border-line")}>
              <button
                onClick={() => {
                  setDate(wd)
                  setView("dia")
                }}
                className="flex w-full items-baseline justify-between border-b border-line px-3 py-2.5 text-left hover:bg-canvas"
              >
                <span className="font-heading text-sm font-bold text-ink capitalize">{fmtWeekdayShort(wd)}</span>
                <span className="text-xs text-subtle">{fmtDateShort(wd)}</span>
              </button>
              <div className="max-h-[calc(100dvh-20rem)] space-y-3 overflow-y-auto p-2 scrollbar-thin">
                {filter.map((c) => {
                  const slots = slotsForDay(c, wd, appointments)
                  const booked = slots.reduce((s, x) => s + x.booked, 0)
                  const cap = slots.reduce((s, x) => s + x.capacity, 0)
                  return (
                    <div key={c}>
                      <p className="mb-1 flex items-center justify-between px-1 text-[11px] font-semibold text-subtle">
                        <span className="inline-flex items-center gap-1">
                          <CollectionIcon collection={c} className="size-3" /> {COLLECTION_META[c].short}
                        </span>
                        <span>
                          {booked}/{cap}
                        </span>
                      </p>
                      <div className="space-y-1">
                        {slots
                          .filter((s) => s.booked > 0 || c !== "sangue")
                          .map((s) => {
                            const list = appointments.filter((a) => a.collection === c && a.date === wd && a.time === s.time && a.status !== "cancelado")
                            return (
                              <div key={s.time} className="rounded-lg bg-canvas px-2 py-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="w-10 text-[11px] font-bold text-ink tabular-nums">{s.time}</span>
                                  <OccupancyBar booked={s.booked} capacity={s.capacity} className="flex-1" />
                                </div>
                                {list.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {list.map((a) => (
                                      <button
                                        key={a.id}
                                        onClick={() => setOpenId(a.id)}
                                        title={patientOf(a.patientId)?.name}
                                        className="relative inline-flex size-6 items-center justify-center rounded-full bg-white text-[9px] font-bold text-navy ring-1 ring-line hover:ring-brand"
                                      >
                                        {initials(patientOf(a.patientId)?.name ?? "?")}
                                        <span className={cn("absolute -right-0.5 -bottom-0.5 size-2 rounded-full ring-1 ring-white", statusDot(a.status))} />
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        {c === "sangue" && booked === 0 && <p className="px-1 py-2 text-center text-[11px] text-subtle">Todos os horários livres</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <AppointmentSheet appointmentId={openId} onClose={() => setOpenId(undefined)} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-1.5 ring-1 ring-line">
      <p className="text-[10px] font-semibold tracking-wide text-subtle uppercase">{label}</p>
      <p className="font-heading text-base leading-tight font-bold text-ink tabular-nums">{value}</p>
    </div>
  )
}

function DayColumn({
  collection,
  date,
  appointments,
  patientOf,
  onOpen,
}: {
  collection: CollectionType
  date: string
  appointments: Appointment[]
  patientOf: (id: string) => Patient | undefined
  onOpen: (id: string) => void
}) {
  const slots = slotsForDay(collection, date, appointments)
  const booked = slots.reduce((s, x) => s + x.booked, 0)
  const cap = slots.reduce((s, x) => s + x.capacity, 0)
  return (
    <section className="rounded-2xl border border-line bg-white shadow-soft">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="inline-flex size-9 items-center justify-center rounded-xl bg-canvas ring-1 ring-line">
          <CollectionIcon collection={collection} className="size-4 text-navy" />
        </span>
        <div className="flex-1">
          <h2 className="font-heading text-base font-bold text-ink">{COLLECTION_META[collection].label}</h2>
          <p className="text-xs text-subtle">
            {collection === "sangue" ? "07h30–11h30 · a cada 15 min · 3 vagas" : "Janelas de entrega · 07h30–16h"}
          </p>
        </div>
        <span className="text-right">
          <span className="block font-heading text-lg leading-none font-bold text-ink">
            {booked}
            <span className="text-sm text-subtle">/{cap}</span>
          </span>
          <span className="text-[11px] text-subtle">vagas ocupadas</span>
        </span>
      </header>
      <ul className="max-h-[calc(100dvh-19rem)] divide-y divide-line overflow-y-auto scrollbar-thin">
        {slots.map((s) => {
          const list = appointments.filter((a) => a.collection === collection && a.date === date && a.time === s.time && a.status !== "cancelado")
          const full = s.booked >= s.capacity
          return (
            <li key={s.time} className={cn("flex gap-3 px-4 py-2.5", full && "bg-red-50/30")}>
              <div className="w-24 shrink-0">
                <p className="font-heading text-sm font-bold text-ink tabular-nums">
                  {s.time}
                  {collection !== "sangue" && <span className="font-medium text-subtle">–{s.endTime}</span>}
                </p>
                <OccupancyBar booked={s.booked} capacity={s.capacity} className="mt-1.5" />
                <p className={cn("mt-1 text-[11px] font-medium", full ? "text-red-700" : "text-subtle")}>
                  {s.booked}/{s.capacity} {full && "· lotado"}
                </p>
              </div>
              <div className="flex min-w-0 flex-1 flex-wrap content-start gap-1.5">
                {list.length === 0 && <span className="self-center text-xs text-subtle/70">Livre</span>}
                {list.map((a) => {
                  const p = patientOf(a.patientId)
                  return (
                    <button
                      key={a.id}
                      onClick={() => onOpen(a.id)}
                      className={cn(
                        "inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border bg-white pr-2.5 pl-1 text-xs font-medium text-ink transition-all hover:border-brand/40 hover:shadow-soft",
                        a.status === "faltou" ? "border-slate-200 text-subtle line-through" : "border-line",
                      )}
                    >
                      <span className="relative inline-flex size-6 items-center justify-center rounded-full bg-canvas text-[9px] font-bold text-navy">
                        {initials(p?.name ?? "?")}
                        <span className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-white", statusDot(a.status))} />
                      </span>
                      <span className="truncate">{p?.name.split(" ").slice(0, 2).join(" ")}</span>
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
