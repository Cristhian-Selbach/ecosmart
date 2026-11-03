"use client"

import {
  ArrowLeftRight,
  ArrowRight,
  CalendarCheck,
  CircleCheck,
  GraduationCap,
  Hand,
  Lock,
  MapPin,
  MessageSquareText,
  Phone,
  Route,
  ShieldAlert,
  Trash,
  Undo2,
  UserRound,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertItem } from "@/components/shared/alert-item"
import { CollectionBadge, FastingBadge, SensitiveName } from "@/components/shared/exam-chip"
import { StatusBadge } from "@/components/shared/status-badge"
import { Timeline } from "@/components/shared/timeline-item"
import { COLLECTION_META, STAFF } from "@/lib/mock-data"
import { REASON_LABEL } from "@/lib/store"
import { ageFrom, fmtDate, fmtDateTime, formatPhone, maskCPF, timeAgo } from "@/lib/format"
import type { Appointment, Exam, ExamRequest, Patient, RequestItem, SmartAlert } from "@/lib/types"
import { cn } from "@/lib/utils"

export function buildChains(request: ExamRequest) {
  const byId = Object.fromEntries(request.items.map((i) => [i.id, i]))
  return request.items
    .filter((i) => !i.replaces)
    .map((root) => {
      const chain: RequestItem[] = [root]
      let cur = root
      while (cur.replacedBy && byId[cur.replacedBy]) {
        cur = byId[cur.replacedBy]
        chain.push(cur)
      }
      return chain
    })
}

export function RequestAnalysis({
  request,
  patient,
  alerts,
  exams,
  appointments,
  meId,
  noShows,
  onClaim,
  onRelease,
  onSwap,
  onRemove,
  onUndo,
}: {
  request: ExamRequest
  patient: Patient
  alerts: SmartAlert[]
  exams: Exam[]
  appointments: Appointment[]
  meId: string
  noShows: number
  onClaim: () => void
  onRelease: () => void
  onSwap: (item: RequestItem) => void
  onRemove: (item: RequestItem) => void
  onUndo: (item: RequestItem) => void
}) {
  const ex = (id: string) => exams.find((e) => e.id === id)
  const assignee = STAFF.find((s) => s.id === request.assignedTo)
  const mine = request.assignedTo === meId
  const open = request.status === "pendente" || request.status === "em_analise"
  const editable = open && mine
  const chains = buildChains(request)
  const activeCount = request.items.filter((i) => i.status === "ativo").length
  const age = ageFrom(patient.birthDate)
  const blockers = alerts.filter((a) => a.severity === "bloqueio")
  const warnings = alerts.filter((a) => a.severity !== "bloqueio")

  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-line bg-white shadow-soft" aria-label="Análise da solicitação">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start gap-4 border-b border-line p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-heading text-2xl font-bold text-ink">{patient.name}</h2>
            <StatusBadge status={request.status} />
          </div>
          <p className="mt-1 text-sm text-subtle">
            <span className="font-mono font-semibold text-navy">{request.protocol}</span> · enviada {timeAgo(request.createdAt)} ({fmtDateTime(request.createdAt)})
          </p>
        </div>
        <div className="flex items-center gap-2">
          {open && !request.assignedTo && (
            <Button size="lg" onClick={onClaim} className="animate-enter">
              <Hand /> Assumir solicitação <kbd className="ml-1 border-white/30 bg-white/15 text-white">A</kbd>
            </Button>
          )}
          {open && mine && (
            <>
              <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-50 px-3 text-sm font-semibold text-blue-800 ring-1 ring-blue-100">
                <span className="size-2 animate-pulse rounded-full bg-blue-500" /> Em análise por você
              </span>
              <Button variant="ghost" onClick={onRelease}>
                <Undo2 /> Devolver
              </Button>
            </>
          )}
          {open && request.assignedTo && !mine && (
            <>
              <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-700">
                <Lock className="size-4" /> Em análise por {assignee?.shortName}
              </span>
              <Button variant="outline" onClick={onClaim}>
                Assumir mesmo assim
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 scrollbar-thin">
        {/* Resumo do paciente */}
        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-canvas p-4 md:grid-cols-3 2xl:grid-cols-6">
          <Info icon={UserRound} label="Idade · sexo" value={`${age} anos · ${patient.sex === "F" ? "Feminino" : "Masculino"}`} />
          <Info icon={Phone} label="Telefone" value={formatPhone(patient.phone)} />
          <Info
            icon={patient.link === "aluno" ? GraduationCap : Users}
            label="Vínculo"
            value={patient.link === "aluno" ? "Aluno(a) UP" : "Comunidade"}
          />
          <Info icon={MapPin} label="Bairro" value={patient.neighborhood} />
          <Info icon={ShieldAlert} label="CPF" value={maskCPF(patient.cpf)} />
          <Info
            icon={CalendarCheck}
            label="Faltas (90 dias)"
            value={noShows ? `${noShows} ${noShows === 1 ? "falta" : "faltas"}` : "Nenhuma"}
            tone={noShows ? "warn" : undefined}
          />
        </div>

        {request.preferences.note && (
          <div className="flex gap-3 rounded-xl border border-line p-3">
            <MessageSquareText className="mt-0.5 size-4 shrink-0 text-brand" />
            <p className="text-sm text-ink/80">
              <span className="font-semibold text-ink">Observação do paciente:</span> “{request.preferences.note}”
            </p>
          </div>
        )}

        {/* Exames */}
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="font-heading text-base font-bold text-ink">
              Exames solicitados <span className="font-normal text-subtle">({activeCount} ativos)</span>
            </h3>
            {!editable && open && <span className="text-xs text-subtle">Assuma a solicitação para editar</span>}
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            {chains.map((chain) => {
              const root = chain[0]
              const last = chain[chain.length - 1]
              const rootExam = ex(root.examId)
              const lastExam = ex(last.examId)
              if (!rootExam || !lastExam) return null
              const changed = chain.length > 1 || last.status === "removido"
              const undoTarget = last.status === "removido" ? last : chain.length > 1 ? chain[chain.length - 2] : undefined
              const changeInfo = last.status === "removido" ? last : chain[chain.length - 2]
              const itemAlerts = alerts.filter((a) => a.examId === lastExam.id && last.status === "ativo")
              const sev = itemAlerts.some((a) => a.severity === "bloqueio") ? "bloqueio" : itemAlerts.length ? "aviso" : null
              return (
                <li
                  key={root.id}
                  className={cn(
                    "relative flex items-center gap-3 px-4 py-3 transition-colors duration-200",
                    sev === "bloqueio" && "bg-red-50/60",
                    sev === "aviso" && "bg-amber-50/40",
                    last.status === "removido" && "bg-slate-50",
                  )}
                >
                  {sev && <span className={cn("absolute top-2 bottom-2 left-0 w-1 rounded-r-full", sev === "bloqueio" ? "bg-red-500" : "bg-amber-400")} aria-hidden />}
                  <CollectionBadge collection={lastExam.collection} withLabel={false} className="size-8 justify-center px-0" />
                  <div className="min-w-0 flex-1">
                    {changed ? (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-sm text-subtle line-through decoration-red-400/70">
                          <SensitiveName exam={rootExam} compact />
                        </span>
                        {last.status === "ativo" && (
                          <>
                            <ArrowRight className="size-3.5 text-subtle" aria-label="trocado por" />
                            <span className="text-sm font-semibold text-ink">
                              <SensitiveName exam={lastExam} compact />
                            </span>
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">TROCADO</span>
                          </>
                        )}
                        {last.status === "removido" && <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">REMOVIDO</span>}
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-ink">
                        <SensitiveName exam={lastExam} compact />
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-subtle">
                      {changed && changeInfo?.reason ? (
                        <>
                          Motivo: {REASON_LABEL[changeInfo.reason]}
                          {changeInfo.reasonNote ? ` — ${changeInfo.reasonNote}` : ""} · por {STAFF.find((s) => s.id === changeInfo.changedBy)?.shortName}
                        </>
                      ) : (
                        <>
                          {lastExam.popularName} · {lastExam.group}
                        </>
                      )}
                    </p>
                  </div>
                  {last.status === "ativo" && <FastingBadge hours={lastExam.fastingHours} />}
                  {editable && (
                    <div className="flex shrink-0 items-center gap-1">
                      {last.status === "ativo" ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => onSwap(last)}>
                            <ArrowLeftRight /> Trocar exame
                          </Button>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon-sm" onClick={() => onRemove(last)} aria-label={`Remover ${lastExam.name}`} className="text-subtle hover:bg-red-50 hover:text-red-700">
                                <Trash />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remover</TooltipContent>
                          </Tooltip>
                        </>
                      ) : null}
                      {undoTarget && (
                        <Button variant="ghost" size="sm" onClick={() => onUndo(undoTarget)} className="text-subtle">
                          <Undo2 /> Desfazer
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        {/* Alertas inteligentes */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-heading text-base font-bold text-ink">Alertas inteligentes</h3>
            {alerts.length > 0 && (
              <span className="text-xs text-subtle">
                {blockers.length > 0 && <span className="font-semibold text-red-700">{blockers.length} bloqueio(s)</span>}
                {blockers.length > 0 && warnings.length > 0 && " · "}
                {warnings.length > 0 && `${warnings.length} aviso(s)`}
              </span>
            )}
          </div>
          {alerts.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-eco/30 bg-eco-soft/60 p-3 animate-enter">
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-white text-eco-strong">
                <CircleCheck className="size-4" />
              </span>
              <p className="text-sm font-medium text-eco-strong">Nenhum alerta. Tudo certo para agendar.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((a) => (
                <AlertItem key={a.id} alert={a} />
              ))}
            </div>
          )}
        </div>

        {/* Agendamentos (quando já agendada) */}
        {appointments.length > 0 && (
          <div>
            <h3 className="mb-2 font-heading text-base font-bold text-ink">Agendamentos</h3>
            <div className="grid gap-2 md:grid-cols-2">
              {appointments.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                  <CollectionBadge collection={a.collection} withLabel={false} className="size-9 justify-center px-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{COLLECTION_META[a.collection].label}</p>
                    <p className="text-xs text-subtle">
                      {fmtDate(a.date)} · {a.time}
                      {a.collection !== "sangue" && `–${a.endTime}`} · {a.room}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Linha do tempo */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 font-heading text-base font-bold text-ink">
            <Route className="size-4 text-subtle" /> Linha do tempo
          </h3>
          <Timeline events={request.events} />
        </div>
      </div>
    </section>
  )
}

function Info({ icon: Icon, label, value, tone }: { icon: typeof Phone; label: string; value: string; tone?: "warn" }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-subtle uppercase">
        <Icon className="size-3" aria-hidden /> {label}
      </p>
      <p className={cn("mt-0.5 truncate text-sm font-semibold", tone === "warn" ? "text-amber-700" : "text-ink")}>{value}</p>
    </div>
  )
}
