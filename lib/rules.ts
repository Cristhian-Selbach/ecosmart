import { differenceInCalendarDays, format, getDay, isWeekend, parseISO, subDays } from "date-fns"
import { COLLECTION_META, SCHEDULE, addMinutesStr, businessDays } from "./mock-data"
import type {
  Appointment,
  CollectionType,
  Exam,
  ExamRequest,
  Patient,
  Preferences,
  PrepSummary,
  RequestItem,
  SlotInfo,
  SlotSuggestion,
  SmartAlert,
  Weekday,
} from "./types"
import { ageFrom, fmtDate } from "./format"

export const COLLECTION_ORDER: CollectionType[] = ["sangue", "urina", "fezes"]
const ACTIVE_APPT: Appointment["status"][] = ["agendado", "checkin"]

export const examIndex = (exams: Exam[]) => Object.fromEntries(exams.map((e) => [e.id, e])) as Record<string, Exam>

export const activeItems = (req: ExamRequest): RequestItem[] => req.items.filter((i) => i.status === "ativo")
export const activeExamIds = (req: ExamRequest) => activeItems(req).map((i) => i.examId)

// ───────────── Agrupamento por tipo de coleta ─────────────

export function groupByCollection(examIds: string[], exams: Exam[]) {
  const idx = examIndex(exams)
  return COLLECTION_ORDER.map((collection) => ({
    collection,
    exams: examIds.map((id) => idx[id]).filter((e): e is Exam => !!e && e.collection === collection),
  })).filter((g) => g.exams.length > 0)
}

// ───────────── Preparo consolidado (o mais restritivo) ─────────────

export function consolidatedPrep(exams: Exam[]): PrepSummary {
  const fastingHours = exams.reduce((m, e) => Math.max(m, e.fastingHours), 0)
  const sentences = new Set<string>()
  for (const e of exams) {
    for (const s of e.prep.split(/(?<=\.)\s+/)) {
      const t = s.trim()
      if (!t || /^Jejum de/i.test(t) || /^Não requer preparo/i.test(t) || /^Pode beber água/i.test(t)) continue
      sentences.add(t.endsWith(".") ? t : `${t}.`)
    }
  }
  const instructions = [...sentences]
  if (fastingHours > 0) instructions.unshift("Durante o jejum, você pode beber água normalmente.")
  const onlySamples = exams.length > 0 && exams.every((e) => e.collection !== "sangue")
  return {
    fastingHours,
    headline:
      fastingHours > 0
        ? `Jejum de ${fastingHours} horas`
        : onlySamples
          ? "Siga as orientações de coleta"
          : "Sem jejum necessário",
    instructions,
  }
}

// ───────────── Agenda: ocupação e sugestões ─────────────

export function bookedCount(appointments: Appointment[], collection: CollectionType, date: string, time: string, ignoreId?: string) {
  return appointments.filter(
    (a) => a.collection === collection && a.date === date && a.time === time && a.status !== "cancelado" && a.id !== ignoreId,
  ).length
}

export function slotsForDay(collection: CollectionType, date: string, appointments: Appointment[], ignoreId?: string): SlotInfo[] {
  if (isWeekend(parseISO(date))) return []
  const room = COLLECTION_META[collection].room
  if (collection === "sangue") {
    return SCHEDULE.bloodTimes.map((time) => ({
      collection, date, time,
      endTime: addMinutesStr(time, SCHEDULE.bloodDuration),
      capacity: SCHEDULE.bloodCapacity,
      booked: bookedCount(appointments, collection, date, time, ignoreId),
      room,
    }))
  }
  return SCHEDULE.sampleWindows.map(([time, endTime]) => ({
    collection, date, time, endTime,
    capacity: SCHEDULE.sampleCapacity,
    booked: bookedCount(appointments, collection, date, time, ignoreId),
    room,
  }))
}

export function upcomingBusinessDates(now = new Date()) {
  return businessDays(now, SCHEDULE.businessDaysAhead).map((d) => format(d, "yyyy-MM-dd"))
}

const isPast = (slot: SlotInfo, now: Date) => {
  const start = parseISO(`${slot.date}T${slot.time}:00`)
  return start.getTime() < now.getTime() + 30 * 60_000
}

export function suggestSlots(
  collection: CollectionType,
  prefs: Preferences,
  fastingHours: number,
  appointments: Appointment[],
  now = new Date(),
  count = 5,
  ignoreId?: string,
): SlotSuggestion[] {
  const dates = upcomingBusinessDates(now)
  const all = dates.flatMap((d) => slotsForDay(collection, d, appointments, ignoreId)).filter((s) => !isPast(s, now) && s.booked < s.capacity)

  const periodOk = (s: SlotInfo) => {
    if (collection === "sangue") return fastingHours >= 8 ? s.time <= "09:30" : true
    if (prefs.period === "manha") return s.time < "12:00"
    if (prefs.period === "tarde") return s.time >= "13:00"
    return true
  }
  const dayOk = (s: SlotInfo) => prefs.days.length === 0 || prefs.days.includes(getDay(parseISO(s.date)) as Weekday)

  const pick = (pool: SlotInfo[], already: SlotSuggestion[], strict: boolean) => {
    const perDay: Record<string, number> = {}
    for (const s of already) perDay[s.date] = (perDay[s.date] ?? 0) + 1
    for (const s of pool) {
      if (already.length >= count) break
      if (already.some((a) => a.date === s.date && a.time === s.time)) continue
      if ((perDay[s.date] ?? 0) >= 2) continue
      perDay[s.date] = (perDay[s.date] ?? 0) + 1
      already.push({ ...s, matchesPreference: strict, tags: tagsFor(s, prefs, fastingHours, strict) })
    }
  }

  const out: SlotSuggestion[] = []
  pick(all.filter((s) => periodOk(s) && dayOk(s)), out, true)
  if (out.length < count) pick(all.filter(periodOk), out, false)
  if (out.length < count) pick(all, out, false)
  return out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
}

function tagsFor(s: SlotInfo, prefs: Preferences, fastingHours: number, strict: boolean) {
  const tags: string[] = []
  if (prefs.days.length && prefs.days.includes(getDay(parseISO(s.date)) as Weekday)) tags.push("Dia preferido")
  if (s.collection === "sangue" && fastingHours > 0 && s.time <= "08:30") tags.push("Ideal p/ jejum")
  if (!strict) tags.push("Fora da preferência")
  return tags
}

// ───────────── Faltas ─────────────

export function recentNoShows(patientId: string, appointments: Appointment[], now = new Date(), days = 90) {
  const since = format(subDays(now, days), "yyyy-MM-dd")
  return appointments.filter((a) => a.patientId === patientId && a.status === "faltou" && a.date >= since)
}

// ───────────── Alertas inteligentes ─────────────

export function computeAlerts(
  req: ExamRequest,
  patient: Patient,
  ctx: { exams: Exam[]; appointments: Appointment[]; requests: ExamRequest[]; now?: Date },
): SmartAlert[] {
  const now = ctx.now ?? new Date()
  const idx = examIndex(ctx.exams)
  const alerts: SmartAlert[] = []
  const age = ageFrom(patient.birthDate, now)
  const items = activeItems(req)
  const exams = items.map((i) => idx[i.examId]).filter(Boolean)

  for (const e of exams) {
    if (e.allowedSex && e.allowedSex !== patient.sex) {
      alerts.push({
        id: `sex-${e.id}`,
        severity: "bloqueio",
        examId: e.id,
        title: `${e.name} solicitado para paciente do sexo ${patient.sex === "F" ? "feminino" : "masculino"}`,
        description: `Exame indicado apenas para o sexo ${e.allowedSex === "M" ? "masculino" : "feminino"}. Troque ou remova o exame para liberar o agendamento.`,
      })
    } else if (e.minAge && age < e.minAge) {
      alerts.push({
        id: `age-${e.id}`,
        severity: "bloqueio",
        examId: e.id,
        title: `${e.name} exige idade mínima de ${e.minAge} anos`,
        description: `Paciente tem ${age} anos. Troque ou remova o exame para continuar.`,
      })
    }
  }

  // histórico do paciente (histórico + agendamentos concluídos)
  const doneAppts = ctx.appointments.filter((a) => a.patientId === patient.id && a.status === "concluido")
  const history = [
    ...patient.history,
    ...doneAppts.flatMap((a) => a.examIds.map((examId) => ({ examId, date: a.date }))),
  ]

  const tip = exams.find((e) => e.id === "tipagem")
  if (tip) {
    const prev = history.filter((h) => h.examId === "tipagem").sort((a, b) => b.date.localeCompare(a.date))[0]
    if (prev)
      alerts.push({
        id: "tipagem-repetida",
        severity: "aviso",
        examId: "tipagem",
        title: "Tipagem sanguínea já realizada anteriormente",
        description: `Registrada em ${fmtDate(prev.date)}. O tipo sanguíneo não muda — considere remover (motivo: Duplicado).`,
      })
  }

  for (const e of exams) {
    if (e.id === "tipagem") continue
    const recent = history
      .filter((h) => h.examId === e.id && differenceInCalendarDays(now, parseISO(h.date)) <= 30 && h.date <= format(now, "yyyy-MM-dd"))
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    if (recent) {
      const days = differenceInCalendarDays(now, parseISO(recent.date))
      alerts.push({
        id: `recent-${e.id}`,
        severity: "aviso",
        examId: e.id,
        title: `${e.sensitive ? "Exame confidencial" : e.name}: feito há ${days} dias`,
        description: "Feito há menos de 30 dias. Confirme com o paciente se é necessário repetir.",
      })
      continue
    }
    const scheduled = ctx.appointments.find(
      (a) => a.patientId === patient.id && a.requestId !== req.id && ACTIVE_APPT.includes(a.status) && a.examIds.includes(e.id),
    )
    if (scheduled) {
      alerts.push({
        id: `dup-${e.id}`,
        severity: "aviso",
        examId: e.id,
        title: `${e.sensitive ? "Exame confidencial" : e.name}: já está na agenda`,
        description: `Exame duplicado: já existe coleta marcada para ${fmtDate(scheduled.date)} às ${scheduled.time}.`,
      })
      continue
    }
    const openReq = ctx.requests.find(
      (r) => r.id !== req.id && r.patientId === patient.id && ["pendente", "em_analise"].includes(r.status) && activeExamIds(r).includes(e.id),
    )
    if (openReq)
      alerts.push({
        id: `open-${e.id}`,
        severity: "aviso",
        examId: e.id,
        title: `${e.name} duplicado em outra solicitação`,
        description: `Também consta na solicitação ${openReq.protocol}, ainda em aberto.`,
      })
  }

  const fasting = exams.filter((e) => e.collection === "sangue").reduce((m, e) => Math.max(m, e.fastingHours), 0)
  if (fasting > 0 && req.preferences.period === "tarde") {
    const fe = exams.filter((e) => e.fastingHours > 0).map((e) => e.name)
    alerts.push({
      id: "jejum-tarde",
      severity: "aviso",
      title: "Exame com jejum e preferência pela tarde",
      description: `${fe.join(", ")} exige jejum de ${fasting}h. Coletas em jejum acontecem pela manhã — combine com o paciente.`,
    })
  }

  const faltas = recentNoShows(patient.id, ctx.appointments, now)
  if (faltas.length > 0)
    alerts.push({
      id: "faltas",
      severity: "aviso",
      title: `Paciente com ${faltas.length} ${faltas.length === 1 ? "falta" : "faltas"} recente${faltas.length === 1 ? "" : "s"}`,
      description: `Última falta em ${fmtDate(faltas.sort((a, b) => b.date.localeCompare(a.date))[0].date)}. Reforce a confirmação pelo WhatsApp.`,
    })

  if (age < 18)
    alerts.push({
      id: "menor",
      severity: "info",
      title: "Paciente menor de idade",
      description: "A coleta exige a presença de um responsável legal.",
    })

  if (exams.some((e) => e.sensitive))
    alerts.push({
      id: "sensivel",
      severity: "info",
      title: "Contém exame confidencial",
      description: "Mantenha discrição em notificações e na entrega de resultados.",
    })

  const order = { bloqueio: 0, aviso: 1, info: 2 }
  return alerts.sort((a, b) => order[a.severity] - order[b.severity])
}

export const hasBlocking = (alerts: SmartAlert[]) => alerts.some((a) => a.severity === "bloqueio")
