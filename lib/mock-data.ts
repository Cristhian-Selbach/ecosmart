import { addDays, format, isWeekend, setHours, setMinutes, subDays, subMinutes } from "date-fns"
import type {
  Appointment,
  CollectionType,
  Exam,
  ExamPackage,
  ExamRequest,
  Patient,
  Preferences,
  RequestItem,
  StaffUser,
  TimelineEvent,
} from "./types"

// ───────────────────────── Exames (preparos FICTÍCIOS para demonstração) ─────────────────────────

const ex = (
  id: string,
  name: string,
  popularName: string,
  group: string,
  collection: CollectionType,
  fastingHours: number,
  prep: string,
  extra: Partial<Exam> = {},
): Exam => ({ id, name, popularName, group, collection, fastingHours, prep, sensitive: false, active: true, ...extra })

export const EXAMS: Exam[] = [
  ex("hemograma", "Hemograma completo", "Exame de sangue completo", "Hematologia", "sangue", 0, "Evite exercícios intensos nas 24 horas anteriores."),
  ex("coagulograma", "Coagulograma", "Teste de coagulação", "Hematologia", "sangue", 4, "Informe se usa anticoagulante ou AAS."),
  ex("tipagem", "Tipagem sanguínea ABO/Rh", "Tipo de sangue", "Hematologia", "sangue", 0, "Não requer preparo."),
  ex("glicose", "Glicose", "Glicemia / açúcar no sangue", "Glicemia", "sangue", 8, "Jejum de 8 horas. Pode beber água."),
  ex("colesterol", "Colesterol total", "Colesterol", "Perfil lipídico", "sangue", 4, "Mantenha a alimentação habitual nos dias anteriores."),
  ex("hdl-ldl", "Colesterol HDL e LDL", "Colesterol bom e ruim", "Perfil lipídico", "sangue", 4, "Mantenha a alimentação habitual nos dias anteriores."),
  ex("triglicerideos", "Triglicerídeos", "Gordura no sangue", "Perfil lipídico", "sangue", 12, "Jejum de 12 horas. Evite álcool nas 72 horas anteriores."),
  ex("ureia", "Ureia", "Filtragem dos rins", "Função renal", "sangue", 4, "Evite refeições muito ricas em proteína na véspera."),
  ex("creatinina", "Creatinina", "Exame dos rins", "Função renal", "sangue", 4, "Evite exercícios intensos nas 24 horas anteriores."),
  ex("alt-ast", "ALT e AST (TGO/TGP)", "Enzimas do fígado", "Função hepática", "sangue", 4, "Evite bebidas alcoólicas nas 72 horas anteriores."),
  ex("gama-gt", "Gama GT", "Enzima do fígado", "Função hepática", "sangue", 4, "Evite bebidas alcoólicas nas 72 horas anteriores."),
  ex("fosfatase", "Fosfatase alcalina", "Fígado e ossos", "Função hepática", "sangue", 4, "Não requer preparo adicional."),
  ex("bilirrubina", "Bilirrubina total e frações", "Exame de icterícia (amarelão)", "Função hepática", "sangue", 4, "Não requer preparo adicional."),
  ex("amilase", "Amilase", "Enzima do pâncreas", "Pâncreas", "sangue", 4, "Não requer preparo adicional."),
  ex("lipase", "Lipase", "Enzima do pâncreas (gorduras)", "Pâncreas", "sangue", 8, "Jejum de 8 horas."),
  ex("pcr", "Proteína C reativa (PCR)", "Exame de inflamação", "Inflamação e reumatologia", "sangue", 0, "Não requer preparo."),
  ex("aso", "Antiestreptolisina O (ASO)", "Infecção de garganta", "Inflamação e reumatologia", "sangue", 0, "Não requer preparo."),
  ex("fator-reumatoide", "Fator reumatoide", "Exame de reumatismo", "Inflamação e reumatologia", "sangue", 0, "Não requer preparo."),
  ex("ferro", "Ferro sérico", "Ferro no sangue", "Ferro e minerais", "sangue", 8, "Jejum de 8 horas. Suspenda suplemento de ferro 24h antes, se possível."),
  ex("ferritina", "Ferritina", "Reserva de ferro", "Ferro e minerais", "sangue", 4, "Não requer preparo adicional."),
  ex("calcio", "Cálcio", "Cálcio no sangue", "Ferro e minerais", "sangue", 4, "Não requer preparo adicional."),
  ex("hiv", "Anti-HIV 1 e 2", "Teste de HIV", "Infecciosos", "sangue", 0, "Não requer preparo.", { sensitive: true }),
  ex("sifilis", "Sífilis (VDRL)", "Teste de sífilis", "Infecciosos", "sangue", 0, "Não requer preparo.", { sensitive: true }),
  ex("psa", "PSA total", "Exame da próstata", "Próstata", "sangue", 0, "Evite atividade sexual e andar de bicicleta nas 48 horas anteriores.", { allowedSex: "M", minAge: 18 }),
  ex("urina", "Parcial de urina (EAS)", "Exame de urina", "Urina", "urina", 0, "Colete a primeira urina da manhã, em frasco estéril, e entregue em até 2 horas."),
  ex("parasitologico", "Parasitológico de fezes", "Exame de verme", "Fezes", "fezes", 0, "Colete em frasco próprio. Entregue em até 24 horas, mantendo refrigerado."),
  ex("sangue-oculto", "Pesquisa de sangue oculto nas fezes", "Sangue nas fezes", "Fezes", "fezes", 0, "Evite carne vermelha nos 3 dias anteriores à coleta."),
  ex("gordura-fecal", "Pesquisa de gordura fecal", "Gordura nas fezes", "Fezes", "fezes", 0, "Mantenha dieta habitual com gordura nos 3 dias anteriores."),
]

export const EXAM_GROUP_ORDER = [
  "Hematologia",
  "Glicemia",
  "Perfil lipídico",
  "Função renal",
  "Função hepática",
  "Pâncreas",
  "Inflamação e reumatologia",
  "Ferro e minerais",
  "Infecciosos",
  "Próstata",
  "Urina",
  "Fezes",
]

export const PACKAGES: ExamPackage[] = [
  { id: "lipidico", label: "Perfil lipídico", examIds: ["colesterol", "hdl-ldl", "triglicerideos"] },
  { id: "renal", label: "Função renal", examIds: ["ureia", "creatinina"] },
  { id: "hepatico", label: "Função hepática", examIds: ["alt-ast", "gama-gt", "fosfatase", "bilirrubina"] },
  { id: "checkup", label: "Check-up básico", examIds: ["hemograma", "glicose", "colesterol", "urina"] },
]

export const COLLECTION_META: Record<
  CollectionType,
  { label: string; short: string; action: string; room: string; emoji: string }
> = {
  sangue: { label: "Coleta de sangue", short: "Sangue", action: "Coleta", room: "Sala de coleta 2", emoji: "🩸" },
  urina: { label: "Entrega de urina", short: "Urina", action: "Entrega de amostra", room: "Recepção de amostras", emoji: "🧪" },
  fezes: { label: "Entrega de fezes", short: "Fezes", action: "Entrega de amostra", room: "Recepção de amostras", emoji: "🧫" },
}

export const CLINIC = {
  name: "Clínica LEAC",
  campus: "Universidade Positivo · Campus Ecoville",
  address: "R. Prof. Pedro Viriato Parigot de Souza, 5300 · Campo Comprido, Curitiba – PR",
}

// ───────────────────────── Agenda ─────────────────────────

export const SCHEDULE = {
  bloodTimes: buildTimes("07:30", "11:15", 15),
  bloodCapacity: 3,
  bloodDuration: 15,
  sampleWindows: [
    ["07:30", "09:00"],
    ["09:00", "10:30"],
    ["10:30", "12:00"],
    ["13:00", "14:30"],
    ["14:30", "16:00"],
  ] as [string, string][],
  sampleCapacity: 6,
  businessDaysAhead: 10,
}

function buildTimes(start: string, end: string, step: number) {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))
  const out: string[] = []
  for (let m = toMin(start); m <= toMin(end); m += step)
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`)
  return out
}

// ───────────────────────── Equipe ─────────────────────────

export const STAFF: StaffUser[] = [
  { id: "maria", name: "Maria Souza", shortName: "Maria", role: "Enfermeira supervisora", initials: "MS", color: "#0B3B6E" },
  { id: "lucas", name: "Lucas Pereira", shortName: "Lucas", role: "Aluno de enfermagem · 6º período", initials: "LP", color: "#10A592" },
  { id: "ana", name: "Dra. Ana Lima", shortName: "Dra. Ana", role: "Preceptora · Medicina", initials: "AL", color: "#3A67A0" },
]

export const REFUSAL_REASONS = [
  "Exame fora do escopo da clínica",
  "Necessário pedido médico",
  "Solicitação duplicada",
  "Paciente fora da área de atendimento",
  "Outro",
]

// ───────────────────────── Pacientes (fictícios) ─────────────────────────

const P = (
  id: string,
  cpf: string,
  name: string,
  birthDate: string,
  sex: "F" | "M",
  phone: string,
  link: "comunidade" | "aluno",
  neighborhood: string,
  extra: Partial<Patient> = {},
): Patient => ({
  id, cpf, name, birthDate, sex, phone, link, neighborhood,
  createdAt: "2025-03-10T10:00:00.000Z",
  consentAt: "2025-03-10T10:00:00.000Z",
  history: [],
  ...extra,
})

function basePatients(now: Date): Patient[] {
  const ago = (d: number) => format(subDays(now, d), "yyyy-MM-dd")
  return [
    P("p1", "45124508582", "Ana Clara Ribeiro", "1992-03-14", "F", "41998761234", "comunidade", "Mossunguê", { email: "anaclara.ribeiro@email.com", history: [{ examId: "hemograma", date: ago(210) }] }),
    P("p2", "42760426157", "João Pedro Almeida", "2005-07-02", "M", "41991234567", "aluno", "Campo Comprido", { email: "joao.almeida@aluno.up.edu.br" }),
    P("p3", "54109914949", "Marlene de Souza Kowalski", "1959-05-21", "F", "41996541122", "comunidade", "Santo Inácio", { history: [{ examId: "glicose", date: ago(180) }, { examId: "colesterol", date: ago(180) }] }),
    P("p4", "14562194219", "Ricardo Tanaka", "1981-02-10", "M", "41987653344", "comunidade", "Bigorrilho", { history: [{ examId: "tipagem", date: ago(412) }, { examId: "hemograma", date: ago(412) }] }),
    P("p5", "53173309200", "Beatriz Nogueira", "1997-09-30", "F", "41992225588", "aluno", "Mossunguê", { email: "beatriz.nogueira@aluno.up.edu.br" }),
    P("p6", "84264761204", "Sebastião Ferreira", "1954-01-18", "M", "41995557711", "comunidade", "São Braz", { history: [{ examId: "hemograma", date: ago(12) }, { examId: "glicose", date: ago(95) }] }),
    P("p7", "40046693408", "Luana Martins", "2007-04-08", "F", "41993338899", "aluno", "Cascatinha", { email: "luana.martins@aluno.up.edu.br" }),
    P("p8", "44844227190", "Helena Zanetti", "2018-06-12", "F", "41991112233", "comunidade", "Orleans", { motherName: "Patrícia Zanetti" }),
    P("p9", "27899876532", "Carlos Eduardo Bastos", "1968-08-25", "M", "41984446677", "comunidade", "Seminário", { history: [{ examId: "glicose", date: ago(150) }] }),
    P("p10", "03323672909", "Fernanda Oliveira", "1985-11-30", "F", "41997778800", "comunidade", "Campo Comprido"),
    P("p11", "03540948589", "Gabriel Santos", "2003-03-03", "M", "41990001122", "aluno", "Mossunguê", { email: "gabriel.santos@aluno.up.edu.br" }),
    P("p12", "41782017607", "Rosa Maria Pacheco", "1948-02-27", "F", "41988882244", "comunidade", "Orleans", { history: [{ examId: "glicose", date: ago(60) }, { examId: "tipagem", date: ago(900) }] }),
    P("p13", "68281000503", "Thiago Moreira", "2010-05-15", "M", "41996663355", "comunidade", "Cascatinha", { motherName: "Cláudia Moreira" }),
    P("p14", "88140240303", "Juliana Castro", "2000-10-09", "F", "41992227744", "aluno", "Bigorrilho", { email: "juliana.castro@aluno.up.edu.br" }),
    P("p15", "22711060446", "Antônio Carlos Wolff", "1965-07-19", "M", "41985559966", "comunidade", "Seminário"),
  ]
}

// ───────────────────────── Seed relativo à data atual ─────────────────────────

export interface SeedData {
  patients: Patient[]
  requests: ExamRequest[]
  appointments: Appointment[]
  exams: Exam[]
  protocolSeq: number
}

let uid = 0
const id = (p: string) => `${p}_${(++uid).toString(36)}${Math.random().toString(36).slice(2, 6)}`

export function businessDays(from: Date, count: number) {
  const out: Date[] = []
  let d = new Date(from)
  d.setHours(0, 0, 0, 0)
  while (out.length < count) {
    if (!isWeekend(d)) out.push(new Date(d))
    d = addDays(d, 1)
  }
  return out
}

export function buildSeed(now = new Date()): SeedData {
  uid = 0
  const patients = basePatients(now)
  const requests: ExamRequest[] = []
  const appointments: Appointment[] = []
  let seq = 31
  const iso = (d: Date) => d.toISOString()
  const day = (d: Date) => format(d, "yyyy-MM-dd")
  const biz = businessDays(now, 10)
  const todayIsBiz = !isWeekend(now)
  const at = (d: Date, hhmm: string) => setMinutes(setHours(d, Number(hhmm.slice(0, 2))), Number(hhmm.slice(3)))
  const protocol = (d: Date) => `CLN-${format(d, "ddMM")}-${String(seq++).padStart(4, "0")}`
  const examById = (eid: string) => EXAMS.find((e) => e.id === eid)!
  const staffName = (sid: string) => STAFF.find((s) => s.id === sid)!.name

  const ev = (at: Date, type: TimelineEvent["type"], title: string, actor?: string, detail?: string): TimelineEvent => ({
    id: id("ev"), at: iso(at), type, title, actor, detail,
  })
  const items = (examIds: string[]): RequestItem[] => examIds.map((examId) => ({ id: id("it"), examId, status: "ativo" }))

  function pending(patientId: string, examIds: string[], minutesAgo: number, prefs: Preferences, opts: { assignedTo?: string; assignedMinAgo?: number } = {}) {
    const created = subMinutes(now, minutesAgo)
    const r: ExamRequest = {
      id: id("req"),
      protocol: protocol(created),
      patientId,
      createdAt: iso(created),
      status: opts.assignedTo ? "em_analise" : "pendente",
      requestedExamIds: examIds,
      items: items(examIds),
      preferences: prefs,
      appointmentIds: [],
      events: [ev(created, "criada", "Solicitação enviada pelo paciente", "Paciente")],
    }
    if (opts.assignedTo) {
      const a = subMinutes(now, opts.assignedMinAgo ?? 3)
      r.assignedTo = opts.assignedTo
      r.assignedAt = iso(a)
      r.events.push(ev(a, "assumida", `Assumida por ${staffName(opts.assignedTo)}`, staffName(opts.assignedTo)))
    }
    requests.push(r)
    return r
  }

  function scheduled(
    patientId: string,
    examIds: string[],
    slots: Partial<Record<CollectionType, { date: Date; time: string }>>,
    opts: { createdAgoMin: number; scheduledAgoMin: number; by: string; status?: Appointment["status"] },
  ) {
    const created = subMinutes(now, opts.createdAgoMin)
    const sched = subMinutes(now, opts.scheduledAgoMin)
    const r: ExamRequest = {
      id: id("req"),
      protocol: protocol(created),
      patientId,
      createdAt: iso(created),
      status: "agendada",
      requestedExamIds: examIds,
      items: items(examIds),
      preferences: { days: [], period: "manha" },
      assignedTo: opts.by,
      assignedAt: iso(subMinutes(sched, 4)),
      scheduledAt: iso(sched),
      appointmentIds: [],
      events: [
        ev(created, "criada", "Solicitação enviada pelo paciente", "Paciente"),
        ev(subMinutes(sched, 4), "assumida", `Assumida por ${staffName(opts.by)}`, staffName(opts.by)),
      ],
    }
    for (const [col, slot] of Object.entries(slots) as [CollectionType, { date: Date; time: string }][]) {
      const colExams = examIds.filter((e) => examById(e).collection === col)
      const window = col === "sangue" ? null : SCHEDULE.sampleWindows.find((w) => w[0] === slot.time)
      const endTime = window ? window[1] : addMinutesStr(slot.time, SCHEDULE.bloodDuration)
      const a: Appointment = {
        id: id("ap"),
        requestId: r.id,
        patientId,
        collection: col,
        date: day(slot.date),
        time: slot.time,
        endTime,
        room: COLLECTION_META[col].room,
        status: opts.status ?? "agendado",
        examIds: colExams,
        createdAt: iso(sched),
      }
      appointments.push(a)
      r.appointmentIds.push(a.id)
      r.events.push(
        ev(sched, "agendada", `${COLLECTION_META[col].label} agendada`, staffName(opts.by), `${format(slot.date, "dd/MM/yyyy")} · ${slot.time}`),
      )
      if (a.status === "faltou") r.events.push(ev(at(slot.date, slot.time), "faltou", "Paciente não compareceu", "Recepção"))
      if (a.status === "concluido") r.events.push(ev(at(slot.date, slot.time), "concluido", `${COLLECTION_META[col].action} concluída`, "Recepção"))
      if (a.status === "checkin") r.events.push(ev(at(slot.date, slot.time), "checkin", "Check-in realizado", "Recepção"))
    }
    requests.push(r)
    return r
  }

  // Histórico (anterior)
  scheduled("p7", ["hemograma"], { sangue: { date: subDays(now, 15), time: "07:45" } }, { createdAgoMin: 60 * 24 * 19, scheduledAgoMin: 60 * 24 * 18, by: "maria", status: "faltou" })
  scheduled("p7", ["glicose"], { sangue: { date: subDays(now, 41), time: "08:00" } }, { createdAgoMin: 60 * 24 * 45, scheduledAgoMin: 60 * 24 * 44, by: "lucas", status: "faltou" })
  scheduled("p6", ["hemograma"], { sangue: { date: subDays(now, 12), time: "07:30" } }, { createdAgoMin: 60 * 24 * 16, scheduledAgoMin: 60 * 24 * 15, by: "maria", status: "concluido" })
  scheduled("p12", ["glicose"], { sangue: { date: subDays(now, 60), time: "07:30" } }, { createdAgoMin: 60 * 24 * 63, scheduledAgoMin: 60 * 24 * 62, by: "ana", status: "concluido" })
  scheduled("p1", ["hemograma"], { sangue: { date: subDays(now, 210), time: "08:15" } }, { createdAgoMin: 60 * 24 * 214, scheduledAgoMin: 60 * 24 * 213, by: "maria", status: "concluido" })
  scheduled("p15", ["glicose"], { sangue: { date: subDays(now, 70), time: "08:30" } }, { createdAgoMin: 60 * 24 * 74, scheduledAgoMin: 60 * 24 * 73, by: "lucas", status: "faltou" })

  // Hoje (ou próximo dia útil)
  const d0 = biz[0]
  scheduled("p4", ["glicose"], { sangue: { date: d0, time: "07:30" } }, { createdAgoMin: 60 * 24 * 4, scheduledAgoMin: 60 * 24 * 3, by: "maria", status: todayIsBiz ? "concluido" : "agendado" })
  scheduled("p3", ["colesterol"], { sangue: { date: d0, time: "07:45" } }, { createdAgoMin: 60 * 24 * 5, scheduledAgoMin: 60 * 24 * 4, by: "lucas", status: todayIsBiz ? "checkin" : "agendado" })
  scheduled("p10", ["calcio"], { sangue: { date: d0, time: "08:00" } }, { createdAgoMin: 60 * 24 * 3, scheduledAgoMin: 60 * 24 * 2, by: "ana" })
  scheduled("p9", ["pcr"], { sangue: { date: d0, time: "08:00" } }, { createdAgoMin: 60 * 24 * 3, scheduledAgoMin: 60 * 24 * 2, by: "maria" })
  scheduled("p1", ["urina"], { urina: { date: d0, time: "07:30" } }, { createdAgoMin: 60 * 24 * 2, scheduledAgoMin: 60 * 24 * 1, by: "lucas" })

  // Próximos dias — alguns horários lotados
  const d1 = biz[1]
  scheduled("p11", ["hemograma", "glicose"], { sangue: { date: d1, time: "07:30" } }, { createdAgoMin: 95, scheduledAgoMin: 52, by: "maria" })
  scheduled("p12", ["hemograma", "creatinina", "ureia", "urina"], { sangue: { date: d1, time: "07:30" }, urina: { date: d1, time: "07:30" } }, { createdAgoMin: 70, scheduledAgoMin: 26, by: "lucas" })
  scheduled("p14", ["ferro", "ferritina"], { sangue: { date: d1, time: "07:30" } }, { createdAgoMin: 60 * 24 + 30, scheduledAgoMin: 60 * 24, by: "maria" })
  scheduled("p9", ["glicose", "colesterol", "hdl-ldl", "triglicerideos"], { sangue: { date: d1, time: "07:45" } }, { createdAgoMin: 60 * 24 + 80, scheduledAgoMin: 60 * 24 + 40, by: "ana" })
  scheduled("p15", ["psa", "hemograma"], { sangue: { date: d1, time: "07:45" } }, { createdAgoMin: 60 * 26, scheduledAgoMin: 60 * 25, by: "maria" })
  scheduled("p13", ["hemograma"], { sangue: { date: d1, time: "07:45" } }, { createdAgoMin: 60 * 28, scheduledAgoMin: 60 * 27, by: "lucas" })
  scheduled("p8", ["hemograma", "parasitologico"], { sangue: { date: d1, time: "08:00" }, fezes: { date: d1, time: "07:30" } }, { createdAgoMin: 60 * 30, scheduledAgoMin: 60 * 29, by: "ana" })
  scheduled("p6", ["creatinina"], { sangue: { date: biz[3], time: "08:15" } }, { createdAgoMin: 60 * 50, scheduledAgoMin: 60 * 48, by: "maria" })
  scheduled("p14", ["urina"], { urina: { date: biz[2], time: "09:00" } }, { createdAgoMin: 60 * 49, scheduledAgoMin: 60 * 47, by: "lucas" })
  scheduled("p2", ["tipagem"], { sangue: { date: biz[2], time: "08:30" } }, { createdAgoMin: 60 * 52, scheduledAgoMin: 60 * 51, by: "ana" })
  scheduled("p10", ["glicose"], { sangue: { date: biz[2], time: "07:30" } }, { createdAgoMin: 60 * 53, scheduledAgoMin: 60 * 52, by: "maria" })
  scheduled("p3", ["ureia"], { sangue: { date: biz[2], time: "07:30" } }, { createdAgoMin: 60 * 54, scheduledAgoMin: 60 * 53, by: "maria" })

  // Fila: 7 pendentes + 1 em análise por outro usuário
  pending("p3", ["psa", "hemograma", "glicose"], 31, { days: [2, 4], period: "manha" }) // PSA mulher → bloqueio
  pending("p4", ["tipagem", "hemograma", "creatinina"], 26, { days: [1, 3, 5], period: "manha" }) // tipagem repetida
  pending("p6", ["hemograma", "creatinina", "ureia"], 22, { days: [], period: "manha", note: "Tenho dificuldade de locomoção, se possível horário mais tranquilo." }) // duplicado / <30 dias
  pending("p10", ["hemograma", "coagulograma", "ferritina"], 19, { days: [3], period: "manha" }, { assignedTo: "lucas", assignedMinAgo: 6 })
  pending("p5", ["glicose", "triglicerideos", "hemograma"], 15, { days: [2, 3, 4], period: "tarde", note: "Trabalho de manhã, prefiro à tarde." }) // jejum + tarde
  pending("p7", ["ferro", "ferritina", "parasitologico"], 11, { days: [1, 2], period: "manha" }) // faltas recentes
  pending("p1", ["hemograma", "glicose", "colesterol"], 7, { days: [1, 3], period: "manha" }) // sem problemas
  pending("p2", ["urina", "pcr", "aso"], 3, { days: [], period: "indiferente" }) // sem problemas

  return {
    patients,
    requests,
    appointments,
    exams: EXAMS.map((e) => ({ ...e })),
    protocolSeq: seq,
  }
}

export function addMinutesStr(hhmm: string, mins: number) {
  const t = Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3)) + mins
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`
}

// ───────────────────────── Dados agregados (base histórica para o dashboard) ─────────────────────────

export const DASHBOARD_BASELINE = {
  topExams: {
    hemograma: 182, glicose: 164, colesterol: 121, triglicerideos: 112, "hdl-ldl": 104, creatinina: 88,
    urina: 86, ureia: 71, "alt-ast": 54, ferritina: 49, pcr: 41, parasitologico: 38, tipagem: 33, psa: 29,
  } as Record<string, number>,
  ageBands: { "0–11": 46, "12–17": 38, "18–29": 212, "30–44": 168, "45–59": 141, "60+": 129 } as Record<string, number>,
  link: { comunidade: 448, aluno: 286 },
  neighborhoods: {
    Mossunguê: 142, "Campo Comprido": 128, Bigorrilho: 96, "Santo Inácio": 81, Cascatinha: 64,
    "São Braz": 59, Orleans: 48, Seminário: 41, Outros: 75,
  } as Record<string, number>,
  corrected: { psa: 14, tipagem: 11, glicose: 9, hemograma: 8, coagulograma: 6, "fator-reumatoide": 5 } as Record<string, number>,
  attended: 431,
  noShows: 52,
}
