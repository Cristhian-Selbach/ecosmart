"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowRight,
  Check,
  ClipboardList,
  Hourglass,
  LoaderCircle,
  Moon,
  Package,
  Pencil,
  Search,
  Send,
  Sun,
  Sunrise,
  X,
} from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CollectionBadge, CollectionIcon, FastingBadge } from "@/components/shared/exam-chip"
import { EmptyState } from "@/components/shared/empty-state"
import { PatientHeader, PatientPageSkeleton, usePatientGuard } from "@/components/paciente/patient-shell"
import { PrepHighlight } from "@/components/paciente/prep-highlight"
import { COLLECTION_META, EXAM_GROUP_ORDER, PACKAGES } from "@/lib/mock-data"
import { consolidatedPrep, groupByCollection } from "@/lib/rules"
import { useData } from "@/lib/store"
import type { Exam, Period, Weekday } from "@/lib/types"
import { cn } from "@/lib/utils"

const STEPS = ["Exames", "Preferências", "Revisão"]
const WEEKDAYS: [Weekday, string, string][] = [
  [1, "Seg", "segunda"],
  [2, "Ter", "terça"],
  [3, "Qua", "quarta"],
  [4, "Qui", "quinta"],
  [5, "Sex", "sexta"],
]
const PERIODS: { id: Period; label: string; hint: string; Icon: typeof Sun }[] = [
  { id: "manha", label: "Manhã", hint: "7h30 – 12h", Icon: Sunrise },
  { id: "tarde", label: "Tarde", hint: "13h – 16h", Icon: Sun },
  { id: "indiferente", label: "Tanto faz", hint: "Qualquer horário", Icon: Moon },
]

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

export default function SolicitarPage() {
  const router = useRouter()
  const patient = usePatientGuard()
  const allExams = useData((s) => s.exams)
  const createRequest = useData((s) => s.createRequest)
  const exams = useMemo(() => allExams.filter((e) => e.active), [allExams])

  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState("")
  const [days, setDays] = useState<Weekday[]>([])
  const [period, setPeriod] = useState<Period>("manha")
  const [note, setNote] = useState("")
  const [sending, setSending] = useState(false)

  const selectedExams = useMemo(() => selected.map((id) => exams.find((e) => e.id === id)).filter(Boolean) as Exam[], [selected, exams])
  const groups = useMemo(() => groupByCollection(selected, exams), [selected, exams])
  const prep = useMemo(() => consolidatedPrep(selectedExams), [selectedExams])

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const go = (n: number) => {
    setStep(n)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  if (!patient) return <PatientPageSkeleton />

  const submit = async () => {
    setSending(true)
    await new Promise((r) => setTimeout(r, 700))
    const req = createRequest(patient.id, selected, { days, period, note: note.trim() || undefined })
    toast.success("Solicitação enviada!", { description: `Protocolo ${req.protocol}` })
    router.push(`/paciente/aguardando/${req.id}`)
  }

  return (
    <>
      <PatientHeader back={step === 0 ? "/paciente/agendamentos" : undefined} title="Solicitar exames" />
      <Stepper step={step} onStep={(n) => n < step && go(n)} />

      <main className="flex-1 px-5 pt-2 pb-36">
        {step === 0 && (
          <ExamPicker exams={exams} selected={selected} toggle={toggle} setSelected={setSelected} query={query} setQuery={setQuery} />
        )}

        {step === 1 && (
          <section className="space-y-7 animate-enter">
            <div>
              <h2 className="font-heading text-2xl font-bold text-ink">Quando fica melhor para você?</h2>
              <p className="mt-1 text-base text-subtle">O atendente vai confirmar o horário de acordo com sua preferência.</p>
            </div>

            <fieldset>
              <legend className="mb-2 text-[15px] font-semibold text-ink">Dias da semana</legend>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map(([d, l, full]) => {
                  const on = days.includes(d)
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      aria-label={full}
                      onClick={() => setDays((s) => (on ? s.filter((x) => x !== d) : [...s, d].sort()))}
                      className={cn(
                        "inline-flex h-12 min-w-14 items-center justify-center gap-1 rounded-full border px-4 text-base font-semibold transition-all duration-150",
                        on ? "border-eco bg-eco text-white shadow-sm" : "border-input bg-white text-ink hover:border-eco/50",
                      )}
                    >
                      {on && <Check className="size-4" />}
                      {l}
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-sm text-subtle">{days.length === 0 ? "Nenhum dia marcado: qualquer dia útil serve." : `${days.length} ${days.length === 1 ? "dia" : "dias"} selecionado(s).`}</p>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-[15px] font-semibold text-ink">Período</legend>
              <div role="radiogroup" className="grid grid-cols-3 gap-2">
                {PERIODS.map((p) => {
                  const on = period === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setPeriod(p.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-2xl border px-2 py-4 transition-all duration-150",
                        on ? "border-eco bg-eco-soft ring-2 ring-eco/25" : "border-input bg-white hover:border-eco/50",
                      )}
                    >
                      <p.Icon className={cn("size-6", on ? "text-eco-strong" : "text-subtle")} />
                      <span className="text-base font-semibold text-ink">{p.label}</span>
                      <span className="text-xs text-subtle">{p.hint}</span>
                    </button>
                  )
                })}
              </div>
              {prep.fastingHours > 0 && period === "tarde" && (
                <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200 animate-enter">
                  <Hourglass className="mt-0.5 size-4 shrink-0" />
                  Você escolheu exames com jejum. Essas coletas costumam acontecer pela manhã, mas o atendente vai combinar o melhor horário com você.
                </p>
              )}
            </fieldset>

            <div>
              <Label htmlFor="note" className="mb-2 block text-[15px] font-semibold text-ink">
                Observação <span className="font-normal text-subtle">(opcional)</span>
              </Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 280))}
                placeholder="Ex.: tenho dificuldade de locomoção, prefiro após as 9h…"
                className="min-h-24 text-base"
              />
              <p className="mt-1 text-right text-xs text-subtle">{note.length}/280</p>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-5 animate-enter">
            <div>
              <h2 className="font-heading text-2xl font-bold text-ink">Revise sua solicitação</h2>
              <p className="mt-1 text-base text-subtle">
                {selected.length} {selected.length === 1 ? "exame" : "exames"} em{" "}
                <strong className="text-ink">
                  {groups.length} {groups.length === 1 ? "atendimento" : "atendimentos"}
                </strong>
                .
              </p>
            </div>

            {groups.map((g) => (
              <div key={g.collection} className="rounded-2xl border border-line bg-white p-4 shadow-soft">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-canvas ring-1 ring-line">
                    <CollectionIcon collection={g.collection} className="size-5 text-navy" />
                  </span>
                  <div className="flex-1">
                    <p className="font-heading text-base font-bold text-ink">{COLLECTION_META[g.collection].label}</p>
                    <p className="text-sm text-subtle">
                      {g.collection === "sangue"
                        ? g.exams.length > 1
                          ? `Uma única coleta para ${g.exams.length} exames`
                          : "Uma coleta"
                        : "Você entrega a amostra em uma janela de horário"}
                    </p>
                  </div>
                </div>
                <ul className="mt-3 divide-y divide-line">
                  {g.exams.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2 py-2.5">
                      <div className="min-w-0">
                        <p className="text-[15px] font-medium text-ink">{e.name}</p>
                        <p className="text-sm text-subtle">{e.popularName}</p>
                      </div>
                      <FastingBadge hours={e.fastingHours} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <PrepHighlight prep={prep} />

            <div className="rounded-2xl border border-line bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="font-heading text-base font-bold text-ink">Suas preferências</p>
                <button onClick={() => go(1)} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-brand">
                  <Pencil className="size-4" /> Editar
                </button>
              </div>
              <dl className="mt-1 space-y-1.5 text-[15px]">
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-subtle">Dias</dt>
                  <dd className="text-ink">{days.length ? WEEKDAYS.filter(([d]) => days.includes(d)).map(([, l]) => l).join(", ") : "Qualquer dia útil"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-subtle">Período</dt>
                  <dd className="text-ink">{PERIODS.find((p) => p.id === period)?.label}</dd>
                </div>
                {note.trim() && (
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-subtle">Obs.</dt>
                    <dd className="text-ink">{note}</dd>
                  </div>
                )}
              </dl>
            </div>
          </section>
        )}
      </main>

      {/* Barra inferior fixa */}
      <div className="no-print fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-line bg-white/95 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] shadow-[0_-8px_24px_-12px_rgb(15_23_42/0.12)] backdrop-blur sm:bottom-6 sm:rounded-b-[2rem]">
        {step === 0 && (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1" aria-live="polite">
              <p className="font-heading text-base font-bold text-ink">
                {selected.length === 0 ? "Nenhum exame" : `${selected.length} ${selected.length === 1 ? "exame selecionado" : "exames selecionados"}`}
              </p>
              <p className="truncate text-sm text-subtle">
                {groups.length ? groups.map((g) => COLLECTION_META[g.collection].short).join(" · ") : "Toque nos exames para selecionar"}
              </p>
            </div>
            <Button size="xl" disabled={!selected.length} onClick={() => go(1)}>
              Continuar <ArrowRight />
            </Button>
          </div>
        )}
        {step === 1 && (
          <div className="flex gap-3">
            <Button size="xl" variant="outline" onClick={() => go(0)}>
              Voltar
            </Button>
            <Button size="xl" className="flex-1" onClick={() => go(2)}>
              Revisar <ArrowRight />
            </Button>
          </div>
        )}
        {step === 2 && (
          <div className="flex gap-3">
            <Button size="xl" variant="outline" onClick={() => go(1)} disabled={sending}>
              Voltar
            </Button>
            <Button size="xl" variant="eco" className="flex-1" onClick={submit} disabled={sending}>
              {sending ? <LoaderCircle className="animate-spin" /> : <Send />}
              {sending ? "Enviando…" : "Enviar solicitação"}
            </Button>
          </div>
        )}
      </div>
    </>
  )
}

function Stepper({ step, onStep }: { step: number; onStep: (n: number) => void }) {
  return (
    <nav aria-label="Etapas" className="px-5 pt-4 pb-3">
      <ol className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const done = i < step
          const current = i === step
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => onStep(i)}
                disabled={!done}
                aria-current={current ? "step" : undefined}
                className="flex min-h-11 items-center gap-2 disabled:cursor-default"
              >
                <span
                  className={cn(
                    "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-200",
                    done && "bg-eco text-white",
                    current && "bg-navy text-white ring-4 ring-navy/15",
                    !done && !current && "bg-slate-100 text-subtle",
                  )}
                >
                  {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                </span>
                <span className={cn("text-sm font-semibold", current ? "text-ink" : "text-subtle", !current && "max-[380px]:sr-only")}>{label}</span>
              </button>
              {i < STEPS.length - 1 && <span className={cn("h-0.5 flex-1 rounded-full transition-colors duration-300", done ? "bg-eco" : "bg-line")} aria-hidden />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function ExamPicker({
  exams,
  selected,
  toggle,
  setSelected,
  query,
  setQuery,
}: {
  exams: Exam[]
  selected: string[]
  toggle: (id: string) => void
  setSelected: React.Dispatch<React.SetStateAction<string[]>>
  query: string
  setQuery: (v: string) => void
}) {
  const q = normalize(query.trim())
  const filtered = q ? exams.filter((e) => normalize(`${e.name} ${e.popularName} ${e.group}`).includes(q)) : exams
  const byGroup = EXAM_GROUP_ORDER.map((g) => ({ group: g, exams: filtered.filter((e) => e.group === g) })).filter((g) => g.exams.length)

  const applyPackage = (ids: string[]) => {
    const available = ids.filter((id) => exams.some((e) => e.id === id))
    const all = available.every((id) => selected.includes(id))
    setSelected((s) => (all ? s.filter((x) => !available.includes(x)) : [...new Set([...s, ...available])]))
  }

  return (
    <section className="animate-enter">
      <h2 className="font-heading text-2xl font-bold text-ink">Quais exames você precisa?</h2>
      <p className="mt-1 text-base text-subtle">Busque pelo nome técnico ou pelo nome popular.</p>

      <div className="sticky top-16 z-20 -mx-5 mt-4 bg-background/95 px-5 py-2 backdrop-blur">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-subtle" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex.: glicemia, colesterol, urina…"
            aria-label="Buscar exames"
            className="h-12 rounded-2xl pr-11 pl-11 text-base"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-1 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-xl text-subtle hover:text-ink"
              aria-label="Limpar busca"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {!q && (
        <div className="mt-3">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-subtle">
            <Package className="size-4" /> Pacotes rápidos
          </p>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-thin">
            {PACKAGES.map((p) => {
              const on = p.examIds.every((id) => selected.includes(id))
              return (
                <button
                  key={p.id}
                  onClick={() => applyPackage(p.examIds)}
                  aria-pressed={on}
                  className={cn(
                    "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[15px] font-semibold whitespace-nowrap transition-all duration-150",
                    on ? "border-navy bg-navy text-white" : "border-line bg-white text-navy hover:border-brand/50",
                  )}
                >
                  {on && <Check className="size-4" />}
                  {p.label}
                  <span className={cn("text-xs font-medium", on ? "text-white/70" : "text-subtle")}>{p.examIds.length}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {byGroup.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhum exame encontrado"
          description={`Não achamos "${query}". Tente outro nome, como "sangue" ou "rins".`}
          action={
            <Button variant="outline" onClick={() => setQuery("")}>
              Limpar busca
            </Button>
          }
        />
      ) : q ? (
        <ul className="mt-3 space-y-2" aria-label="Resultados da busca">
          {filtered.map((e) => (
            <li key={e.id}>
              <ExamOption exam={e} on={selected.includes(e.id)} onToggle={() => toggle(e.id)} />
            </li>
          ))}
        </ul>
      ) : (
        <Accordion type="multiple" defaultValue={["Hematologia", "Glicemia"]} className="mt-4 space-y-2">
          {byGroup.map(({ group, exams: list }) => {
            const count = list.filter((e) => selected.includes(e.id)).length
            return (
              <AccordionItem key={group} value={group} className="overflow-hidden rounded-2xl border border-line bg-white px-0 last:border-b">
                <AccordionTrigger className="min-h-14 px-4 text-base font-semibold hover:no-underline">
                  <span className="flex flex-1 items-center gap-2">
                    <CollectionIcon collection={list[0].collection} className="size-4 text-subtle" />
                    {group}
                    {count > 0 && (
                      <span className="ml-auto mr-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-eco px-1.5 text-xs font-bold text-white">
                        {count}
                      </span>
                    )}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 px-3 pb-3">
                  {list.map((e) => (
                    <ExamOption key={e.id} exam={e} on={selected.includes(e.id)} onToggle={() => toggle(e.id)} />
                  ))}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}
    </section>
  )
}

function ExamOption({ exam, on, onToggle }: { exam: Exam; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-150",
        on ? "border-eco bg-eco-soft/60" : "border-transparent bg-canvas hover:border-line",
      )}
    >
      <span
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors duration-150",
          on ? "border-eco bg-eco text-white" : "border-slate-300 bg-white",
        )}
        aria-hidden
      >
        {on && <Check className="size-4" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base leading-snug font-semibold text-ink">{exam.name}</span>
        <span className="block text-sm text-subtle">{exam.popularName}</span>
        <span className="mt-1.5 flex flex-wrap gap-1">
          <CollectionBadge collection={exam.collection} />
          <FastingBadge hours={exam.fastingHours} />
        </span>
      </span>
    </button>
  )
}
