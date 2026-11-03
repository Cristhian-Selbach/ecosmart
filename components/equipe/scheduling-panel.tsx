"use client"

import { useEffect, useMemo, useState } from "react"
import { Ban, CalendarClock, CalendarDays, CalendarSearch, Hand, Hourglass, LoaderCircle, Lock, Sparkles, Sun, Sunrise } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CollectionIcon, SensitiveName } from "@/components/shared/exam-chip"
import { EmptyState } from "@/components/shared/empty-state"
import { SlotCard } from "@/components/shared/slot-card"
import { COLLECTION_META, REFUSAL_REASONS } from "@/lib/mock-data"
import { consolidatedPrep, slotsForDay, suggestSlots, upcomingBusinessDates } from "@/lib/rules"
import type { SlotChoice } from "@/lib/store"
import { REASON_LABEL } from "@/lib/store"
import { ageFrom, fmtDateShort, fmtLongDate, fmtWeekdayShort, formatPhone } from "@/lib/format"
import type { Appointment, CollectionType, Exam, ExamRequest, Patient, SlotInfo } from "@/lib/types"
import { cn } from "@/lib/utils"

const DAY_LABEL: Record<number, string> = { 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex" }
const PERIOD_LABEL = { manha: "Manhã", tarde: "Tarde", indiferente: "Qualquer período" }

export interface CollectionGroup {
  collection: CollectionType
  exams: Exam[]
}

export function SchedulingPanel({
  request,
  groups,
  appointments,
  choices,
  setChoice,
  editable,
  claimed,
  blocked,
  onReview,
  onRefuse,
  onClaim,
}: {
  request: ExamRequest
  groups: CollectionGroup[]
  appointments: Appointment[]
  choices: Partial<Record<CollectionType, SlotChoice>>
  setChoice: (c: CollectionType, s?: SlotChoice) => void
  editable: boolean
  claimed: boolean
  blocked: boolean
  onReview: () => void
  onRefuse: () => void
  onClaim: () => void
}) {
  const [allFor, setAllFor] = useState<CollectionType | null>(null)
  const open = request.status === "pendente" || request.status === "em_analise"
  const complete = groups.length > 0 && groups.every((g) => choices[g.collection])
  const prefs = request.preferences

  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-line bg-white shadow-soft" aria-label="Agendamento">
      <div className="border-b border-line p-4">
        <h2 className="font-heading text-lg font-bold text-ink">Agendamento</h2>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-1 font-medium text-ink/80 ring-1 ring-line">
            <CalendarDays className="size-3.5" />
            {prefs.days.length ? prefs.days.map((d) => DAY_LABEL[d]).join(", ") : "Qualquer dia"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-1 font-medium text-ink/80 ring-1 ring-line">
            {prefs.period === "tarde" ? <Sun className="size-3.5" /> : <Sunrise className="size-3.5" />}
            {PERIOD_LABEL[prefs.period]}
          </span>
          <span className="text-subtle">preferência do paciente</span>
        </div>
      </div>

      {!open ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={request.status === "agendada" ? CalendarClock : Ban}
            title={request.status === "agendada" ? "Solicitação agendada" : "Solicitação encerrada"}
            description={
              request.status === "agendada"
                ? "Os horários estão confirmados. Ajustes podem ser feitos pela Agenda."
                : request.refusalReason
                  ? `Motivo: ${request.refusalReason}`
                  : "Nenhuma ação pendente."
            }
          />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState icon={CalendarSearch} title="Sem exames ativos" description="Inclua um exame ou recuse a solicitação." />
        </div>
      ) : (
        <div className="relative min-h-0 flex-1 space-y-5 overflow-y-auto p-4 scrollbar-thin">
          {!editable && (
            <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-1 flex items-center gap-3 border-b border-line bg-white/95 px-4 py-3 backdrop-blur">
              <Lock className="size-4 text-subtle" />
              <p className="flex-1 text-xs text-subtle">
                {claimed ? "Outra pessoa está analisando esta solicitação." : "Assuma a solicitação para escolher horários."}
              </p>
              {!claimed && (
                <Button size="sm" onClick={onClaim}>
                  <Hand /> Assumir
                </Button>
              )}
            </div>
          )}
          {groups.map((g) => {
            const prep = consolidatedPrep(g.exams)
            return (
              <CollectionSuggestions
                key={g.collection}
                group={g}
                fastingHours={prep.fastingHours}
                request={request}
                appointments={appointments}
                choice={choices[g.collection]}
                onChoose={(s) => setChoice(g.collection, s)}
                disabled={!editable}
                onSeeAll={() => setAllFor(g.collection)}
              />
            )
          })}
        </div>
      )}

      {open && groups.length > 0 && (
        <div className="space-y-2 border-t border-line p-4">
          {blocked && editable && (
            <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
              <Ban className="size-3.5 shrink-0" /> Resolva os bloqueios antes de agendar.
            </p>
          )}
          <Button size="lg" variant="eco" className="w-full" disabled={!editable || !complete || blocked} onClick={onReview}>
            Revisar e confirmar
            <kbd className="ml-1 border-white/30 bg-white/15 text-white">Enter</kbd>
          </Button>
          <div className="flex items-center justify-between">
            <p className="text-xs text-subtle">
              {complete ? "Horários selecionados" : `${groups.filter((g) => choices[g.collection]).length}/${groups.length} horários escolhidos`}
            </p>
            <Button variant="ghost" size="sm" disabled={!editable} onClick={onRefuse} className="text-red-700 hover:bg-red-50 hover:text-red-800">
              Recusar solicitação
            </Button>
          </div>
        </div>
      )}

      {allFor && (
        <AllSlotsDialog
          collection={allFor}
          appointments={appointments}
          selected={choices[allFor]}
          onClose={() => setAllFor(null)}
          onChoose={(s) => {
            setChoice(allFor, s)
            setAllFor(null)
          }}
        />
      )}
    </section>
  )
}

function CollectionSuggestions({
  group,
  fastingHours,
  request,
  appointments,
  choice,
  onChoose,
  disabled,
  onSeeAll,
}: {
  group: CollectionGroup
  fastingHours: number
  request: ExamRequest
  appointments: Appointment[]
  choice?: SlotChoice
  onChoose: (s?: SlotChoice) => void
  disabled: boolean
  onSeeAll: () => void
}) {
  const [loading, setLoading] = useState(true)
  const key = `${request.id}-${group.collection}-${fastingHours}`
  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 380)
    return () => clearTimeout(t)
  }, [key])

  const suggestions = useMemo(
    () => suggestSlots(group.collection, request.preferences, fastingHours, appointments),
    [group.collection, request.preferences, fastingHours, appointments],
  )
  const meta = COLLECTION_META[group.collection]
  const choiceIsSuggestion = choice && suggestions.some((s) => s.date === choice.date && s.time === choice.time)

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-canvas ring-1 ring-line">
          <CollectionIcon collection={group.collection} className="size-4 text-navy" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">{meta.label}</p>
          <p className="truncate text-xs text-subtle">
            {group.exams.length} {group.exams.length === 1 ? "exame" : "exames"}
            {group.collection === "sangue" && group.exams.length > 1 && " · 1 coleta"}
            {fastingHours > 0 && (
              <span className="ml-1 inline-flex items-center gap-0.5 font-semibold text-navy">
                · <Hourglass className="size-3" /> jejum {fastingHours}h
              </span>
            )}
          </p>
        </div>
      </div>
      <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold tracking-wide text-eco-strong uppercase">
        <Sparkles className="size-3" /> 5 próximas sugestões
      </p>
      {loading ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-[104px] animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {suggestions.map((s) => (
            <SlotCard
              key={s.date + s.time}
              slot={s}
              tags={s.tags}
              disabled={disabled}
              selected={choice?.date === s.date && choice?.time === s.time}
              onSelect={() =>
                onChoose(
                  choice?.date === s.date && choice?.time === s.time
                    ? undefined
                    : { collection: s.collection, date: s.date, time: s.time, endTime: s.endTime },
                )
              }
            />
          ))}
          {choice && !choiceIsSuggestion && (
            <SlotCard
              slot={{ ...choice, capacity: 1, booked: 0, room: meta.room }}
              tags={["Escolhido manualmente"]}
              selected
              disabled={disabled}
              onSelect={() => onChoose(undefined)}
            />
          )}
          <button
            onClick={onSeeAll}
            disabled={disabled}
            className="flex min-h-[104px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-xs font-semibold text-brand transition-colors hover:border-brand/40 hover:bg-brand-soft/40 disabled:opacity-50"
          >
            <CalendarSearch className="size-5" />
            Ver todos os horários
          </button>
        </div>
      )}
    </div>
  )
}

function AllSlotsDialog({
  collection,
  appointments,
  selected,
  onClose,
  onChoose,
}: {
  collection: CollectionType
  appointments: Appointment[]
  selected?: SlotChoice
  onClose: () => void
  onChoose: (s: SlotChoice) => void
}) {
  const dates = useMemo(() => upcomingBusinessDates(), [])
  const [date, setDate] = useState(selected?.date ?? dates[0])
  const now = Date.now()
  const slots: SlotInfo[] = slotsForDay(collection, date, appointments)
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{COLLECTION_META[collection].label} · todos os horários</DialogTitle>
          <DialogDescription>Próximos 10 dias úteis. Horários lotados ficam desabilitados.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {dates.map((d) => (
            <button
              key={d}
              onClick={() => setDate(d)}
              className={cn(
                "flex min-w-14 flex-col items-center rounded-xl border px-2 py-1.5 text-xs transition-colors",
                d === date ? "border-navy bg-navy text-white" : "border-line hover:border-brand/40",
              )}
            >
              <span className="capitalize">{fmtWeekdayShort(d)}</span>
              <span className="font-heading text-sm font-bold">{fmtDateShort(d)}</span>
            </button>
          ))}
        </div>
        <p className="text-sm font-semibold text-ink capitalize">{fmtLongDate(date)}</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((s) => {
            const past = new Date(`${s.date}T${s.time}:00`).getTime() < now + 30 * 60_000
            return (
              <SlotCard
                key={s.time}
                slot={s}
                showDate={false}
                disabled={past}
                selected={selected?.date === s.date && selected?.time === s.time}
                onSelect={() => onChoose({ collection, date: s.date, time: s.time, endTime: s.endTime })}
              />
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────── Modal de confirmação ───────────────────────

export function ConfirmScheduleDialog({
  open,
  onOpenChange,
  request,
  patient,
  groups,
  choices,
  exams,
  warnings,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  request: ExamRequest
  patient: Patient
  groups: CollectionGroup[]
  choices: Partial<Record<CollectionType, SlotChoice>>
  exams: Exam[]
  warnings: number
  onConfirm: () => Promise<void> | void
}) {
  const [busy, setBusy] = useState(false)
  // Congela os dados enquanto o modal está aberto: ao confirmar, a página limpa as escolhas
  // e o conteúdo continua montado durante a animação de saída.
  const [snap, setSnap] = useState({ groups, choices })
  useEffect(() => {
    if (open) {
      setBusy(false)
      setSnap({ groups, choices })
    }
  }, [open, groups, choices])
  const rows = (open ? groups : snap.groups)
    .map((g) => ({ g, c: (open ? choices : snap.choices)[g.collection] }))
    .filter((r): r is { g: CollectionGroup; c: SlotChoice } => !!r.c)
  const allExams = rows.flatMap((r) => r.g.exams)
  const prep = consolidatedPrep(allExams)
  const changes = request.items.filter((i) => i.status !== "ativo")
  const ex = (id: string) => exams.find((e) => e.id === id)

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="gap-5 rounded-2xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Confirmar agendamento</DialogTitle>
          <DialogDescription>Revise o resumo antes de confirmar. O paciente será notificado na hora.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-xl bg-canvas p-3">
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-white font-heading text-sm font-bold text-navy ring-1 ring-line">
            {patient.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">{patient.name}</p>
            <p className="text-xs text-subtle">
              {ageFrom(patient.birthDate)} anos · {formatPhone(patient.phone)} · <span className="font-mono">{request.protocol}</span>
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {rows.map(({ g, c }) => {
            return (
              <div key={g.collection} className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-bold text-ink">
                    <CollectionIcon collection={g.collection} className="size-4 text-navy" />
                    {COLLECTION_META[g.collection].label}
                  </p>
                  <p className="text-sm font-semibold text-eco-strong capitalize">
                    {fmtWeekdayShort(c.date)}, {fmtDateShort(c.date)} · {c.time}
                    {g.collection !== "sangue" && `–${c.endTime}`}
                  </p>
                </div>
                <p className="mt-1 text-xs text-subtle">{COLLECTION_META[g.collection].room} · Clínica LEAC</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {g.exams.map((e) => (
                    <li key={e.id} className="rounded-full bg-canvas px-2 py-0.5 text-xs text-ink ring-1 ring-line">
                      <SensitiveName exam={e} compact />
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
            <p className="text-[11px] font-bold tracking-wide text-amber-800 uppercase">Preparo</p>
            <p className="font-heading text-base font-bold text-amber-950">{prep.headline}</p>
          </div>
          <div className="rounded-xl bg-canvas p-3 ring-1 ring-line">
            <p className="text-[11px] font-bold tracking-wide text-subtle uppercase">Alterações no pedido</p>
            <p className="text-sm font-semibold text-ink">{changes.length ? `${changes.length} registrada(s)` : "Nenhuma"}</p>
            {changes.slice(0, 2).map((c) => (
              <p key={c.id} className="truncate text-xs text-subtle">
                {ex(c.examId)?.name} {c.status === "removido" ? "removido" : "trocado"} · {c.reason && REASON_LABEL[c.reason]}
              </p>
            ))}
          </div>
        </div>

        {warnings > 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Há {warnings} aviso(s) nesta solicitação. Eles não impedem o agendamento.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Voltar
          </Button>
          <Button
            variant="eco"
            size="lg"
            autoFocus
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              await onConfirm()
            }}
          >
            {busy && <LoaderCircle className="animate-spin" />}
            Confirmar agendamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────── Recusa ───────────────────────

export function RefuseDialog({ open, onOpenChange, onConfirm }: { open: boolean; onOpenChange: (v: boolean) => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState<string>()
  const [note, setNote] = useState("")
  useEffect(() => {
    if (open) {
      setReason(undefined)
      setNote("")
    }
  }, [open])
  const valid = !!reason && (reason !== "Outro" || note.trim().length > 2)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Recusar solicitação</DialogTitle>
          <DialogDescription>O paciente verá o motivo informado.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="refuse-reason">
            Motivo <span className="text-red-600">*</span>
          </Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger id="refuse-reason" className="w-full">
              <SelectValue placeholder="Selecione o motivo" />
            </SelectTrigger>
            <SelectContent>
              {REFUSAL_REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {reason === "Outro" && (
          <div className="space-y-1.5 animate-enter">
            <Label htmlFor="refuse-note">
              Descreva <span className="text-red-600">*</span>
            </Label>
            <Textarea id="refuse-note" value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={!valid} onClick={() => valid && onConfirm(reason === "Outro" ? note.trim() : reason!)}>
            Recusar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
