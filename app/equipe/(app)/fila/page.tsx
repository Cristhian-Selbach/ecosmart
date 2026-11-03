"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { MousePointerClick } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { QueueList, type QueueEntry, type QueueTab } from "@/components/equipe/queue-list"
import { RequestAnalysis } from "@/components/equipe/request-analysis"
import { ConfirmScheduleDialog, RefuseDialog, SchedulingPanel } from "@/components/equipe/scheduling-panel"
import { RemoveExamDialog, SwapExamDialog } from "@/components/equipe/exam-change-dialogs"
import { activeExamIds, computeAlerts, groupByCollection, hasBlocking, recentNoShows } from "@/lib/rules"
import { useCurrentStaff, useData, type SlotChoice } from "@/lib/store"
import { firstName } from "@/lib/format"
import { isTypingTarget, useNow } from "@/lib/hooks"
import type { CollectionType, RequestItem } from "@/lib/types"

type Choices = Partial<Record<CollectionType, SlotChoice>>

export default function FilaPage() {
  return (
    <Suspense>
      <Fila />
    </Suspense>
  )
}

function tabOf(status: string, scheduledAt?: string): QueueTab | null {
  if (status === "pendente") return "pendentes"
  if (status === "em_analise") return "em_analise"
  if (status === "agendada" && scheduledAt && format(new Date(scheduledAt), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")) return "hoje"
  return null
}

function Fila() {
  const params = useSearchParams()
  const staff = useCurrentStaff()!
  const requests = useData((s) => s.requests)
  const patients = useData((s) => s.patients)
  const appointments = useData((s) => s.appointments)
  const exams = useData((s) => s.exams)
  const actions = useData.getState()
  useNow(30_000)

  const [tab, setTab] = useState<QueueTab>("pendentes")
  const [selectedId, setSelectedId] = useState<string>()
  const [choicesByReq, setChoicesByReq] = useState<Record<string, Choices>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [refuseOpen, setRefuseOpen] = useState(false)
  const [swapItem, setSwapItem] = useState<RequestItem>()
  const [removeItem, setRemoveItem] = useState<RequestItem>()

  // Entradas da fila (com alertas calculados)
  const all = useMemo(() => {
    const out: (QueueEntry & { tab: QueueTab | null })[] = []
    for (const r of requests) {
      const p = patients.find((x) => x.id === r.patientId)
      if (!p) continue
      out.push({
        request: r,
        patient: p,
        alerts: computeAlerts(r, p, { exams, appointments, requests }),
        examCount: activeExamIds(r).length,
        appointments: appointments.filter((a) => a.requestId === r.id),
        tab: tabOf(r.status, r.scheduledAt),
      })
    }
    return out
  }, [requests, patients, exams, appointments])

  const entries = useMemo(() => {
    const list = all.filter((e) => e.tab === tab)
    return tab === "hoje"
      ? list.sort((a, b) => (b.request.scheduledAt ?? "").localeCompare(a.request.scheduledAt ?? ""))
      : list.sort((a, b) => a.request.createdAt.localeCompare(b.request.createdAt))
  }, [all, tab])

  const counts = useMemo(
    () => ({
      pendentes: all.filter((e) => e.tab === "pendentes").length,
      em_analise: all.filter((e) => e.tab === "em_analise").length,
      hoje: all.filter((e) => e.tab === "hoje").length,
    }),
    [all],
  )

  // Seleção via URL (busca global / toast)
  const paramId = params.get("id")
  useEffect(() => {
    if (!paramId) return
    const e = all.find((x) => x.request.id === paramId)
    if (e) {
      setSelectedId(paramId)
      if (e.tab) setTab(e.tab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramId])

  // Seleção padrão
  useEffect(() => {
    if (!selectedId && entries.length) setSelectedId(entries[0].request.id)
  }, [selectedId, entries])

  const current = all.find((e) => e.request.id === selectedId)
  const request = current?.request
  const groups = useMemo(() => (request ? groupByCollection(activeExamIds(request), exams) : []), [request, exams])
  const mine = request?.assignedTo === staff.id
  const open = request && (request.status === "pendente" || request.status === "em_analise")
  const editable = !!open && mine
  const blocked = current ? hasBlocking(current.alerts) : false
  const choices: Choices = useMemo(() => {
    const c = (request && choicesByReq[request.id]) || {}
    // descarta escolhas de tipos de coleta que não existem mais
    return Object.fromEntries(Object.entries(c).filter(([k]) => groups.some((g) => g.collection === k))) as Choices
  }, [request, choicesByReq, groups])
  const complete = groups.length > 0 && groups.every((g) => choices[g.collection])

  const setChoice = (col: CollectionType, s?: SlotChoice) =>
    request && setChoicesByReq((m) => ({ ...m, [request.id]: { ...m[request.id], [col]: s } }))

  const claim = useCallback(() => {
    if (!request || !open) return
    actions.claimRequest(request.id, staff.id)
    toast.success("Solicitação assumida", { description: `${current?.patient.name} · agora em análise por você.` })
    setTab("em_analise")
  }, [request, open, actions, staff.id, current?.patient.name])

  const confirmSchedule = async () => {
    if (!request || !current) return
    const selected = groups.map((g) => choices[g.collection])
    if (!selected.length || selected.some((c) => !c)) {
      setConfirmOpen(false)
      toast.error("Escolha um horário para cada tipo de coleta")
      return
    }
    await new Promise((r) => setTimeout(r, 550))
    actions.scheduleRequest(request.id, selected as SlotChoice[], staff.id)
    setConfirmOpen(false)
    setChoicesByReq((m) => ({ ...m, [request.id]: {} }))
    toast.success("Agendamento confirmado", {
      description: `${firstName(current.patient.name)} já pode ver o comprovante · ${request.protocol}`,
    })
    setTab("hoje")
  }

  // Atalhos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return
      if (document.querySelector('[role="dialog"]')) return
      const k = e.key.toLowerCase()
      if (k === "j" || k === "k") {
        e.preventDefault()
        if (!entries.length) return
        const idx = entries.findIndex((x) => x.request.id === selectedId)
        const next = k === "j" ? Math.min(entries.length - 1, idx + 1) : Math.max(0, idx - 1)
        setSelectedId(entries[idx === -1 ? 0 : next].request.id)
      } else if (k === "a") {
        if (request && open && !request.assignedTo) {
          e.preventDefault()
          claim()
        }
      } else if (e.key === "Enter") {
        if (editable && complete && !blocked) {
          e.preventDefault()
          setConfirmOpen(true)
        } else if (editable && blocked) {
          toast.error("Há bloqueios pendentes", { description: "Troque ou remova o exame bloqueado antes de agendar." })
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [entries, selectedId, request, open, editable, complete, blocked, claim])

  const swapExam = exams.find((e) => e.id === swapItem?.examId)
  const removeExam = exams.find((e) => e.id === removeItem?.examId)

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[300px_minmax(0,1fr)] xl:h-full xl:grid-cols-[320px_minmax(0,1fr)_370px] 2xl:grid-cols-[340px_minmax(0,1fr)_420px]">
      <div className="flex min-h-0 flex-col lg:row-span-2 lg:h-[calc(100dvh-6rem)] xl:row-span-1 xl:h-auto">
        <QueueList
          tab={tab}
          setTab={setTab}
          counts={counts}
          entries={entries}
          selectedId={selectedId}
          onSelect={setSelectedId}
          meId={staff.id}
        />
      </div>

      {current && request ? (
        <>
          <div key={request.id} className="flex min-h-0 flex-col animate-enter lg:h-[calc(100dvh-6rem)] xl:h-auto">
            <RequestAnalysis
              request={request}
              patient={current.patient}
              alerts={current.alerts}
              exams={exams}
              appointments={current.appointments}
              meId={staff.id}
              noShows={recentNoShows(current.patient.id, appointments).length}
              onClaim={claim}
              onRelease={() => {
                actions.releaseRequest(request.id, staff.id)
                setTab("pendentes")
                toast("Solicitação devolvida para a fila")
              }}
              onSwap={setSwapItem}
              onRemove={setRemoveItem}
              onUndo={(item) => {
                actions.undoChange(request.id, item.id, staff.id)
                toast("Alteração desfeita")
              }}
            />
          </div>
          <div className="flex min-h-0 flex-col lg:col-start-2 lg:h-[calc(100dvh-6rem)] xl:col-start-3 xl:row-start-1 xl:h-auto">
            <SchedulingPanel
              request={request}
              groups={groups}
              appointments={appointments}
              choices={choices}
              setChoice={setChoice}
              editable={editable}
              claimed={!!request.assignedTo}
              blocked={blocked}
              onReview={() => setConfirmOpen(true)}
              onRefuse={() => setRefuseOpen(true)}
              onClaim={claim}
            />
          </div>

          <ConfirmScheduleDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            request={request}
            patient={current.patient}
            groups={groups}
            choices={choices}
            exams={exams}
            warnings={current.alerts.filter((a) => a.severity === "aviso").length}
            onConfirm={confirmSchedule}
          />
          <RefuseDialog
            open={refuseOpen}
            onOpenChange={setRefuseOpen}
            onConfirm={(reason) => {
              actions.refuseRequest(request.id, reason, staff.id)
              setRefuseOpen(false)
              toast("Solicitação recusada", { description: "O paciente foi informado do motivo." })
              setTab("pendentes")
              setSelectedId(undefined)
            }}
          />
          <SwapExamDialog
            open={!!swapItem}
            onOpenChange={(v) => !v && setSwapItem(undefined)}
            current={swapExam}
            exams={exams}
            excludeIds={activeExamIds(request)}
            onConfirm={(newId, reason, note) => {
              actions.swapExam(request.id, swapItem!.id, newId, reason, note, staff.id)
              const to = exams.find((e) => e.id === newId)
              toast.success("Exame trocado", { description: `${swapExam?.name} → ${to?.name}` })
              setSwapItem(undefined)
            }}
          />
          <RemoveExamDialog
            open={!!removeItem}
            onOpenChange={(v) => !v && setRemoveItem(undefined)}
            current={removeExam}
            lastOne={activeExamIds(request).length === 1}
            onConfirm={(reason, note) => {
              actions.removeExam(request.id, removeItem!.id, reason, note, staff.id)
              toast.success("Exame removido", { description: removeExam?.name })
              setRemoveItem(undefined)
            }}
          />
        </>
      ) : (
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-line bg-white/60 xl:col-span-2">
          <EmptyState icon={MousePointerClick} title="Selecione uma solicitação" description="Escolha um item da fila para ver os detalhes, alertas e sugestões de horário." />
        </div>
      )}
    </div>
  )
}
