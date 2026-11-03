"use client"

import { useEffect, useRef } from "react"
import { CalendarCheck, Inbox, Lock, SearchCheck } from "lucide-react"
import { AlertIcons } from "@/components/shared/alert-item"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { useFresh } from "@/components/equipe/fresh-store"
import { STAFF } from "@/lib/mock-data"
import { ageFrom, initials, timeAgo } from "@/lib/format"
import type { Appointment, ExamRequest, Patient, SmartAlert } from "@/lib/types"
import { cn } from "@/lib/utils"

export type QueueTab = "pendentes" | "em_analise" | "hoje"

export interface QueueEntry {
  request: ExamRequest
  patient: Patient
  alerts: SmartAlert[]
  examCount: number
  appointments: Appointment[]
}

export function QueueList({
  tab,
  setTab,
  counts,
  entries,
  selectedId,
  onSelect,
  meId,
}: {
  tab: QueueTab
  setTab: (t: QueueTab) => void
  counts: Record<QueueTab, number>
  entries: QueueEntry[]
  selectedId?: string
  onSelect: (id: string) => void
  meId: string
}) {
  const fresh = useFresh((s) => s.ids)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!selectedId) return
    listRef.current?.querySelector(`[data-id="${selectedId}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [selectedId])

  const TABS: [QueueTab, string][] = [
    ["pendentes", "Pendentes"],
    ["em_analise", "Em análise"],
    ["hoje", "Agendadas hoje"],
  ]

  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-line bg-white shadow-soft" aria-label="Fila de solicitações">
      <div className="border-b border-line p-4 pb-3">
        <div className="flex items-baseline justify-between">
          <h1 className="font-heading text-lg font-bold text-ink">Fila de solicitações</h1>
          <span className="text-xs text-subtle">por ordem de chegada</span>
        </div>
        <div role="tablist" className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-canvas p-1">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
                tab === id ? "bg-white text-navy shadow-sm ring-1 ring-line" : "text-subtle hover:text-ink",
              )}
            >
              <span className="truncate">{label}</span>
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] tabular-nums",
                  tab === id ? (id === "pendentes" ? "bg-amber-400 text-amber-950" : "bg-navy text-white") : "bg-slate-200 text-slate-600",
                )}
              >
                {counts[id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          {tab === "pendentes" ? (
            <EmptyState icon={Inbox} title="Fila zerada!" description="Nenhuma solicitação aguardando. Novas solicitações aparecem aqui automaticamente." />
          ) : tab === "em_analise" ? (
            <EmptyState icon={SearchCheck} title="Nada em análise" description="Assuma uma solicitação pendente para começar." />
          ) : (
            <EmptyState icon={CalendarCheck} title="Nenhum agendamento hoje" description="As solicitações agendadas hoje aparecem aqui." />
          )}
        </div>
      ) : (
        <ul ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 scrollbar-thin" role="listbox" aria-label="Solicitações">
          {entries.map(({ request: r, patient: p, alerts, examCount, appointments }, idx) => {
            const selected = r.id === selectedId
            const assignee = STAFF.find((s) => s.id === r.assignedTo)
            const waitMin = (Date.now() - new Date(r.createdAt).getTime()) / 60000
            const isFresh = fresh.includes(r.id)
            return (
              <li key={r.id} data-id={r.id} className={cn(isFresh && "animate-enter")}>
                <button
                  role="option"
                  aria-selected={selected}
                  onClick={() => onSelect(r.id)}
                  className={cn(
                    "relative flex w-full flex-col gap-2 rounded-xl border p-3 text-left transition-all duration-150",
                    selected ? "border-navy bg-brand-soft/50 ring-2 ring-navy/15" : "border-line bg-white hover:border-brand/30 hover:bg-canvas/60",
                    isFresh && "animate-highlight",
                  )}
                >
                  {selected && <span className="absolute top-3 bottom-3 left-0 w-1 rounded-r-full bg-navy" aria-hidden />}
                  <div className="flex items-start gap-2.5">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-canvas font-heading text-xs font-bold text-navy ring-1 ring-line">
                      {initials(p.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                        {isFresh && <span className="rounded-full bg-eco px-1.5 py-0.5 text-[10px] font-bold text-white">NOVA</span>}
                      </div>
                      <p className="text-xs text-subtle">
                        {ageFrom(p.birthDate)} anos · {examCount} {examCount === 1 ? "exame" : "exames"}
                        {tab === "pendentes" && <span className="ml-1 text-subtle/70">#{idx + 1}</span>}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-xs font-medium tabular-nums",
                        r.status === "pendente" && waitMin > 25 ? "text-amber-700" : "text-subtle",
                      )}
                    >
                      {tab === "hoje" && r.scheduledAt ? timeAgo(r.scheduledAt) : timeAgo(r.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={r.status} />
                    <AlertIcons alerts={alerts} />
                  </div>
                  {r.status === "em_analise" && assignee && (
                    <p
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium",
                        assignee.id === meId ? "bg-blue-50 text-blue-800" : "bg-slate-100 text-slate-700",
                      )}
                    >
                      {assignee.id !== meId && <Lock className="size-3" />}
                      <span className="inline-flex size-4 items-center justify-center rounded-full text-[8px] font-bold text-white" style={{ background: assignee.color }}>
                        {assignee.initials}
                      </span>
                      Em análise por {assignee.id === meId ? "você" : assignee.shortName}
                    </p>
                  )}
                  {tab === "hoje" && appointments.length > 0 && (
                    <p className="flex flex-wrap gap-1 text-xs text-subtle">
                      {appointments.map((a) => (
                        <span key={a.id} className="rounded-md bg-eco-soft px-1.5 py-0.5 font-medium text-eco-strong">
                          {a.date.slice(8)}/{a.date.slice(5, 7)} {a.time}
                        </span>
                      ))}
                    </p>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-4 py-2.5 text-[11px] text-subtle">
        <span className="inline-flex items-center gap-1">
          <kbd>J</kbd>
          <kbd>K</kbd> navegar
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd>A</kbd> assumir
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd>Enter</kbd> confirmar
        </span>
      </div>
    </section>
  )
}
