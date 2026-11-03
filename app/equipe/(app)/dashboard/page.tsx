"use client"

import { useMemo, useState } from "react"
import { addDays, format, startOfWeek } from "date-fns"
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { CalendarCheck, ChartBar, Inbox, Percent, Table2, UserX } from "lucide-react"
import { DASHBOARD_BASELINE } from "@/lib/mock-data"
import { activeExamIds, slotsForDay, upcomingBusinessDates, COLLECTION_ORDER } from "@/lib/rules"
import { useData } from "@/lib/store"
import { AGE_BANDS, ageBand, ageFrom } from "@/lib/format"
import { cn } from "@/lib/utils"

// Paleta validada (scripts/validate_palette.js): ambos passam em banda de luminosidade, CVD e contraste ≥ 3:1.
const C_BLUE = "#3A67A0"
const C_ECO = "#0E9A88"
const GRID = "#E9EEF4"
const INK_2 = "#64748B"

type Row = { name: string; value: number }

export default function DashboardPage() {
  const requests = useData((s) => s.requests)
  const appointments = useData((s) => s.appointments)
  const patients = useData((s) => s.patients)
  const exams = useData((s) => s.exams)

  const d = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd")
    const mon = startOfWeek(new Date(), { weekStartsOn: 1 })
    const week = Array.from({ length: 5 }, (_, i) => format(addDays(mon, i), "yyyy-MM-dd"))
    const validReqs = requests.filter((r) => r.status !== "cancelada" && r.status !== "recusada")
    const patientOf = (id: string) => patients.find((p) => p.id === id)
    const examName = (id: string) => exams.find((e) => e.id === id)?.name ?? id

    const reqToday = requests.filter((r) => format(new Date(r.createdAt), "yyyy-MM-dd") === today)
    const pending = requests.filter((r) => r.status === "pendente").length
    const weekAppts = appointments.filter((a) => week.includes(a.date) && a.status !== "cancelado")
    const faltas = DASHBOARD_BASELINE.noShows + appointments.filter((a) => a.status === "faltou").length
    const atendidos = DASHBOARD_BASELINE.attended + appointments.filter((a) => a.status === "concluido" || a.status === "faltou").length
    const dates = upcomingBusinessDates()
    let cap = 0
    let booked = 0
    for (const dt of dates)
      for (const c of COLLECTION_ORDER)
        for (const s of slotsForDay(c, dt, appointments)) {
          cap += s.capacity
          booked += s.booked
        }

    const top: Record<string, number> = { ...DASHBOARD_BASELINE.topExams }
    const ages: Record<string, number> = { ...DASHBOARD_BASELINE.ageBands }
    const link = { ...DASHBOARD_BASELINE.link }
    const hoods: Record<string, number> = { ...DASHBOARD_BASELINE.neighborhoods }
    const corrected: Record<string, number> = { ...DASHBOARD_BASELINE.corrected }
    for (const r of validReqs) {
      const p = patientOf(r.patientId)
      for (const id of activeExamIds(r)) top[id] = (top[id] ?? 0) + 1
      if (p) {
        const b = ageBand(ageFrom(p.birthDate))
        ages[b] = (ages[b] ?? 0) + 1
        link[p.link] += 1
        const h = p.neighborhood in hoods && p.neighborhood !== "Outros" ? p.neighborhood : "Outros"
        hoods[h] = (hoods[h] ?? 0) + 1
      }
    }
    for (const r of requests) for (const i of r.items) if (i.status !== "ativo") corrected[i.examId] = (corrected[i.examId] ?? 0) + 1

    const rank = (m: Record<string, number>, label: (k: string) => string, n = 8): Row[] =>
      Object.entries(m)
        .map(([k, v]) => ({ name: label(k), value: v }))
        .sort((a, b) => b.value - a.value)
        .slice(0, n)
    const hoodRows = rank(hoods, (k) => k, 9)
    const outros = hoodRows.findIndex((r) => r.name === "Outros")
    if (outros >= 0) hoodRows.push(hoodRows.splice(outros, 1)[0])

    return {
      reqToday: reqToday.length,
      pending,
      weekAppts: weekAppts.length,
      weekBlood: weekAppts.filter((a) => a.collection === "sangue").length,
      noShowRate: (faltas / atendidos) * 100,
      occupancy: cap ? (booked / cap) * 100 : 0,
      booked,
      cap,
      top: rank(top, examName),
      ages: AGE_BANDS.map((b) => ({ name: b, value: ages[b] ?? 0 })),
      link,
      hoods: hoodRows,
      corrected: rank(corrected, examName, 6),
    }
  }, [requests, appointments, patients, exams])

  const totalLink = d.link.comunidade + d.link.aluno
  const pctCom = (d.link.comunidade / totalLink) * 100

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">Dashboard</h1>
        <p className="text-sm text-subtle">Indicadores agregados e anônimos · últimos 90 dias + dados em tempo real</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Inbox} label="Solicitações hoje" value={String(d.reqToday)} sub={`${d.pending} aguardando na fila`} />
        <Kpi icon={CalendarCheck} label="Agendamentos da semana" value={String(d.weekAppts)} sub={`${d.weekBlood} coletas de sangue`} />
        <Kpi icon={UserX} label="Taxa de faltas" value={`${d.noShowRate.toFixed(1).replace(".", ",")}%`} sub="sobre atendimentos concluídos" />
        <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <p className="flex items-center gap-2 text-sm font-medium text-subtle">
            <Percent className="size-4" /> Ocupação da agenda
          </p>
          <p className="mt-2 font-heading text-3xl font-bold text-ink tabular-nums">{Math.round(d.occupancy)}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100" role="meter" aria-valuenow={Math.round(d.occupancy)} aria-valuemin={0} aria-valuemax={100} aria-label="Ocupação da agenda">
            <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${Math.max(2, d.occupancy)}%` }} />
          </div>
          <p className="mt-2 text-xs text-subtle">
            {d.booked} de {d.cap} vagas · próximos 10 dias úteis
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Exames mais procurados" subtitle="Solicitações por exame" rows={d.top} unit="solicitações">
          <HBar rows={d.top} unit="solicitações" />
        </ChartCard>
        <ChartCard title="Exames por faixa etária" subtitle="Solicitações por idade do paciente (anos)" rows={d.ages} unit="solicitações">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={d.ages} margin={{ top: 24, right: 8, left: -12, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: INK_2, fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: INK_2, fontSize: 12 }} />
              <Tooltip content={<Tip unit="solicitações" />} cursor={{ fill: "#F1F5F9" }} />
              <Bar dataKey="value" fill={C_BLUE} radius={[4, 4, 0, 0]} maxBarSize={24}>
                <LabelList dataKey="value" position="top" fill="#0F172A" fontSize={12} fontWeight={600} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          title="Comunidade vs. alunos"
          subtitle="Pacientes atendidos por vínculo"
          rows={[
            { name: "Comunidade", value: d.link.comunidade },
            { name: "Alunos UP", value: d.link.aluno },
          ]}
          unit="pacientes"
        >
          <div className="flex h-[300px] flex-col justify-center gap-6 px-2">
            <div className="flex gap-6 text-sm">
              <Legend color={C_BLUE} label="Comunidade" />
              <Legend color={C_ECO} label="Alunos UP" />
            </div>
            <div className="flex h-12 gap-[2px]" role="img" aria-label={`Comunidade ${Math.round(pctCom)}%, alunos ${Math.round(100 - pctCom)}%`}>
              <div className="group relative rounded-l-md" style={{ width: `${pctCom}%`, background: C_BLUE }} title={`Comunidade: ${d.link.comunidade}`} />
              <div className="group relative rounded-r-md" style={{ width: `${100 - pctCom}%`, background: C_ECO }} title={`Alunos UP: ${d.link.aluno}`} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-heading text-3xl font-bold text-ink tabular-nums">{Math.round(pctCom)}%</p>
                <p className="text-sm text-subtle">Comunidade · {d.link.comunidade}</p>
              </div>
              <div>
                <p className="font-heading text-3xl font-bold text-ink tabular-nums">{Math.round(100 - pctCom)}%</p>
                <p className="text-sm text-subtle">Alunos UP · {d.link.aluno}</p>
              </div>
            </div>
          </div>
        </ChartCard>
        <ChartCard title="Bairros atendidos" subtitle="Pacientes por bairro" rows={d.hoods} unit="pacientes">
          <HBar rows={d.hoods} unit="pacientes" />
        </ChartCard>
        <ChartCard title="Exames mais corrigidos" subtitle="Trocas e remoções feitas pelos atendentes" rows={d.corrected} unit="correções">
          <HBar rows={d.corrected} unit="correções" />
        </ChartCard>
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, sub }: { icon: typeof Inbox; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <p className="flex items-center gap-2 text-sm font-medium text-subtle">
        <Icon className="size-4" /> {label}
      </p>
      <p className="mt-2 font-heading text-3xl font-bold text-ink tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-subtle">{sub}</p>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-ink/80">
      <span className="size-3 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  )
}

function ChartCard({ title, subtitle, rows, unit, children }: { title: string; subtitle: string; rows: Row[]; unit: string; children: React.ReactNode }) {
  const [table, setTable] = useState(false)
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-bold text-ink">{title}</h2>
          <p className="text-xs text-subtle">{subtitle}</p>
        </div>
        <button
          onClick={() => setTable((v) => !v)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-subtle hover:bg-canvas hover:text-ink"
          aria-pressed={table}
        >
          {table ? <ChartBar className="size-3.5" /> : <Table2 className="size-3.5" />}
          {table ? "Gráfico" : "Tabela"}
        </button>
      </header>
      {table ? (
        <div className="h-[300px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-subtle">
                <th className="py-2 font-medium">Categoria</th>
                <th className="py-2 text-right font-medium capitalize">{unit}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-b border-line/60">
                  <td className="py-2 text-ink">{r.name}</td>
                  <td className="py-2 text-right font-semibold text-ink tabular-nums">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  )
}

function HBar({ rows, unit }: { rows: Row[]; unit: string }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 36, left: 4, bottom: 0 }} barCategoryGap="22%">
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: INK_2, fontSize: 11 }} />
        <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} tick={{ fill: "#334155", fontSize: 12 }} interval={0} />
        <Tooltip content={<Tip unit={unit} />} cursor={{ fill: "#F1F5F9" }} />
        <Bar dataKey="value" fill={C_BLUE} radius={[0, 4, 4, 0]} maxBarSize={20}>
          <LabelList dataKey="value" position="right" fill="#0F172A" fontSize={12} fontWeight={600} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function Tip({ active, payload, unit }: { active?: boolean; payload?: { payload: Row }[]; unit: string }) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  return (
    <div className={cn("rounded-xl border border-line bg-white px-3 py-2 text-sm shadow-lift")}>
      <p className="font-semibold text-ink">{r.name}</p>
      <p className="text-subtle">
        <span className="font-semibold text-ink tabular-nums">{r.value}</span> {unit}
      </p>
    </div>
  )
}
