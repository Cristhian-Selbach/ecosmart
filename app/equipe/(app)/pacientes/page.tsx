"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight, GraduationCap, Mail, MapPin, Phone, Search, UserRound, Users, UserSearch } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertItem } from "@/components/shared/alert-item"
import { EmptyState } from "@/components/shared/empty-state"
import { CollectionIcon, SensitiveName } from "@/components/shared/exam-chip"
import { StatusBadge } from "@/components/shared/status-badge"
import { TimelineItem } from "@/components/shared/timeline-item"
import { recentNoShows } from "@/lib/rules"
import { useData } from "@/lib/store"
import { AGE_BANDS, ageBand, ageFrom, fmtDate, formatCPF, formatPhone, initials, onlyDigits } from "@/lib/format"
import type { Patient, SmartAlert } from "@/lib/types"
import { cn } from "@/lib/utils"

const PAGE = 8
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

export default function PacientesPage() {
  return (
    <Suspense>
      <Pacientes />
    </Suspense>
  )
}

function Pacientes() {
  const router = useRouter()
  const params = useSearchParams()
  const patients = useData((s) => s.patients)
  const requests = useData((s) => s.requests)
  const appointments = useData((s) => s.appointments)
  const [q, setQ] = useState("")
  const [link, setLink] = useState("todos")
  const [band, setBand] = useState("todas")
  const [page, setPage] = useState(0)
  const [openId, setOpenId] = useState<string>()

  useEffect(() => {
    const id = params.get("id")
    if (id) setOpenId(id)
  }, [params])

  const filtered = useMemo(() => {
    const t = norm(q.trim())
    const d = onlyDigits(q)
    return patients
      .filter((p) => {
        if (link !== "todos" && p.link !== link) return false
        if (band !== "todas" && ageBand(ageFrom(p.birthDate)) !== band) return false
        if (!t) return true
        return norm(p.name).includes(t) || (d.length >= 3 && (p.cpf.includes(d) || p.phone.includes(d)))
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [patients, q, link, band])

  useEffect(() => setPage(0), [q, link, band])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const rows = filtered.slice(page * PAGE, page * PAGE + PAGE)

  const lastVisit = (p: Patient) => {
    const dates = [...p.history.map((h) => h.date), ...appointments.filter((a) => a.patientId === p.id && a.status === "concluido").map((a) => a.date)].sort()
    return dates[dates.length - 1]
  }
  const nextAppt = (p: Patient) =>
    appointments
      .filter((a) => a.patientId === p.id && ["agendado", "checkin"].includes(a.status))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0]

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Pacientes</h1>
          <p className="text-sm text-subtle">{patients.length} pacientes cadastrados</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-soft">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, CPF ou telefone" className="pl-9" aria-label="Buscar pacientes" />
        </div>
        <Select value={link} onValueChange={setLink}>
          <SelectTrigger className="w-44" aria-label="Filtrar por vínculo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os vínculos</SelectItem>
            <SelectItem value="comunidade">Comunidade</SelectItem>
            <SelectItem value="aluno">Alunos UP</SelectItem>
          </SelectContent>
        </Select>
        <Select value={band} onValueChange={setBand}>
          <SelectTrigger className="w-44" aria-label="Filtrar por faixa etária">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as idades</SelectItem>
            {AGE_BANDS.map((b) => (
              <SelectItem key={b} value={b}>
                {b} anos
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
        {rows.length === 0 ? (
          <EmptyState
            icon={UserSearch}
            title="Nenhum paciente encontrado"
            description="Ajuste a busca ou os filtros."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQ("")
                  setLink("todos")
                  setBand("todas")
                }}
              >
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-canvas/70 hover:bg-canvas/70">
                <TableHead className="pl-5">Paciente</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Vínculo</TableHead>
                <TableHead>Bairro</TableHead>
                <TableHead>Última coleta</TableHead>
                <TableHead className="pr-5">Próximo agendamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => {
                const next = nextAppt(p)
                const last = lastVisit(p)
                const faltas = recentNoShows(p.id, appointments).length
                return (
                  <TableRow key={p.id} className="h-14 cursor-pointer" onClick={() => setOpenId(p.id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpenId(p.id)}>
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex size-9 items-center justify-center rounded-full bg-canvas text-xs font-bold text-navy ring-1 ring-line">{initials(p.name)}</span>
                        <div>
                          <p className="font-semibold text-ink">{p.name}</p>
                          <p className="text-xs text-subtle">
                            {ageFrom(p.birthDate)} anos · {p.sex === "F" ? "F" : "M"}
                            {faltas > 0 && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">{faltas} falta(s)</span>}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{formatCPF(p.cpf)}</TableCell>
                    <TableCell className="text-sm">{formatPhone(p.phone)}</TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", p.link === "aluno" ? "bg-brand-soft text-navy" : "bg-eco-soft text-eco-strong")}>
                        {p.link === "aluno" ? <GraduationCap className="size-3" /> : <Users className="size-3" />}
                        {p.link === "aluno" ? "Aluno UP" : "Comunidade"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{p.neighborhood}</TableCell>
                    <TableCell className="text-sm text-subtle">{last ? fmtDate(last) : "—"}</TableCell>
                    <TableCell className="pr-5 text-sm">
                      {next ? (
                        <span className="inline-flex items-center gap-1.5">
                          <CollectionIcon collection={next.collection} className="size-3.5 text-subtle" />
                          {fmtDate(next.date)} · {next.time}
                        </span>
                      ) : (
                        <span className="text-subtle">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm text-subtle">
          <span>
            {filtered.length ? `${page * PAGE + 1}–${Math.min(filtered.length, (page + 1) * PAGE)} de ${filtered.length}` : "0 resultados"}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior">
              <ChevronLeft />
            </Button>
            <span className="px-2 tabular-nums">
              {page + 1} / {pages}
            </span>
            <Button variant="ghost" size="icon-sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} aria-label="Próxima página">
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>

      <PatientDrawer
        patient={patients.find((p) => p.id === openId)}
        onClose={() => {
          setOpenId(undefined)
          if (params.get("id")) router.replace("/equipe/pacientes")
        }}
        requests={requests}
      />
    </div>
  )
}

function PatientDrawer({ patient, onClose, requests }: { patient?: Patient; onClose: () => void; requests: ReturnType<typeof useData.getState>["requests"] }) {
  const appointments = useData((s) => s.appointments)
  const exams = useData((s) => s.exams)
  if (!patient)
    return (
      <Sheet open={false}>
        <SheetContent />
      </Sheet>
    )

  const age = ageFrom(patient.birthDate)
  const mine = requests.filter((r) => r.patientId === patient.id)
  const appts = appointments.filter((a) => a.patientId === patient.id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
  const faltas = recentNoShows(patient.id, appointments)
  const history = [
    ...patient.history.map((h) => ({ key: `h-${h.examId}-${h.date}`, date: h.date, examId: h.examId, status: "concluido" as const })),
    ...appts.flatMap((a) => a.examIds.map((examId) => ({ key: `${a.id}-${examId}`, date: a.date, examId, status: a.status }))),
  ]
    .filter((h, i, arr) => arr.findIndex((x) => x.date === h.date && x.examId === h.examId) === i)
    .sort((a, b) => b.date.localeCompare(a.date))
  const events = mine
    .flatMap((r) => r.events.map((e) => ({ ...e, title: `${e.title}`, detail: [r.protocol, e.detail].filter(Boolean).join(" · ") })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 12)

  const alerts: SmartAlert[] = []
  if (faltas.length) alerts.push({ id: "f", severity: "aviso", title: `${faltas.length} falta(s) nos últimos 90 dias`, description: "Reforce a confirmação pelo WhatsApp antes da coleta." })
  const tip = history.find((h) => h.examId === "tipagem" && h.status === "concluido")
  if (tip) alerts.push({ id: "t", severity: "info", title: "Tipagem sanguínea já registrada", description: `Realizada em ${fmtDate(tip.date)}.` })
  if (age < 18) alerts.push({ id: "m", severity: "info", title: "Menor de idade", description: "Coletas exigem a presença de um responsável." })

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader className="border-b border-line bg-gradient-to-br from-brand-soft to-white p-6">
          <div className="flex items-center gap-4">
            <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-navy font-heading text-lg font-bold text-white">{initials(patient.name)}</span>
            <div>
              <SheetTitle className="font-heading text-2xl">{patient.name}</SheetTitle>
              <SheetDescription>
                {age} anos · {patient.sex === "F" ? "Feminino" : "Masculino"} · nascido(a) em {fmtDate(patient.birthDate)}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="space-y-7 p-6">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <Item icon={UserRound} label="CPF" value={formatCPF(patient.cpf)} />
            <Item icon={Phone} label="Telefone" value={formatPhone(patient.phone)} />
            <Item icon={Mail} label="E-mail" value={patient.email ?? "—"} />
            <Item icon={MapPin} label="Bairro" value={patient.neighborhood} />
            <Item icon={patient.link === "aluno" ? GraduationCap : Users} label="Vínculo" value={patient.link === "aluno" ? "Aluno(a) Universidade Positivo" : "Comunidade"} />
            <Item icon={UserRound} label="Nome da mãe" value={patient.motherName ?? "—"} />
          </dl>

          {alerts.length > 0 && (
            <section>
              <h3 className="mb-2 font-heading text-base font-bold text-ink">Alertas</h3>
              <div className="space-y-2">
                {alerts.map((a) => (
                  <AlertItem key={a.id} alert={a} />
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-2 font-heading text-base font-bold text-ink">Histórico de exames</h3>
            {history.length === 0 ? (
              <p className="rounded-xl bg-canvas p-4 text-sm text-subtle">Nenhum exame registrado ainda.</p>
            ) : (
              <ul className="divide-y divide-line rounded-2xl border border-line">
                {history.map((h) => {
                  const e = exams.find((x) => x.id === h.examId)
                  return e ? (
                    <li key={h.key} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <CollectionIcon collection={e.collection} className="size-4 text-subtle" />
                      <span className="flex-1 text-ink">
                        <SensitiveName exam={e} compact />
                      </span>
                      <span className="text-xs text-subtle tabular-nums">{fmtDate(h.date)}</span>
                      <StatusBadge status={h.status} />
                    </li>
                  ) : null
                })}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-3 font-heading text-base font-bold text-ink">Linha do tempo</h3>
            {events.length === 0 ? (
              <p className="rounded-xl bg-canvas p-4 text-sm text-subtle">Sem atividades.</p>
            ) : (
              <ol>
                {events.map((e, i) => (
                  <TimelineItem key={e.id} event={e} last={i === events.length - 1} />
                ))}
              </ol>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Item({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-xs text-subtle">
        <Icon className="size-3.5" /> {label}
      </dt>
      <dd className="mt-0.5 truncate font-medium text-ink">{value}</dd>
    </div>
  )
}
