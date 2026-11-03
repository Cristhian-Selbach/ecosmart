// ───────────────────────── Domínio EcoSmart Saúde ─────────────────────────

export type CollectionType = "sangue" | "urina" | "fezes"
export type Sex = "F" | "M"
export type Link = "comunidade" | "aluno"
export type Period = "manha" | "tarde" | "indiferente"
/** 1 = segunda … 5 = sexta (mesma convenção do date-fns getDay) */
export type Weekday = 1 | 2 | 3 | 4 | 5

export interface Exam {
  id: string
  name: string
  popularName: string
  group: string
  collection: CollectionType
  fastingHours: number
  prep: string
  allowedSex?: Sex
  minAge?: number
  sensitive: boolean
  active: boolean
}

export interface ExamPackage {
  id: string
  label: string
  examIds: string[]
}

export interface ExamHistoryEntry {
  examId: string
  /** yyyy-MM-dd */
  date: string
}

export interface Patient {
  id: string
  cpf: string // somente dígitos
  name: string
  /** yyyy-MM-dd */
  birthDate: string
  sex: Sex
  phone: string // somente dígitos
  email?: string
  motherName?: string
  link: Link
  neighborhood: string
  createdAt: string
  consentAt: string
  history: ExamHistoryEntry[]
}

export type RequestStatus = "pendente" | "em_analise" | "agendada" | "recusada" | "cancelada"

export type ChangeReason =
  | "escolha_errada"
  | "indisponivel"
  | "equivalente"
  | "duplicado"
  | "outro"

export interface RequestItem {
  id: string
  examId: string
  status: "ativo" | "trocado" | "removido"
  /** item que este substitui (quando foi incluído por troca) */
  replaces?: string
  /** item que substituiu este */
  replacedBy?: string
  addedByStaff?: boolean
  reason?: ChangeReason
  reasonNote?: string
  changedBy?: string
  changedAt?: string
}

export type TimelineType =
  | "criada"
  | "assumida"
  | "liberada"
  | "exame_trocado"
  | "exame_removido"
  | "agendada"
  | "recusada"
  | "cancelada"
  | "checkin"
  | "concluido"
  | "faltou"
  | "remarcado"

export interface TimelineEvent {
  id: string
  at: string
  type: TimelineType
  actor?: string
  title: string
  detail?: string
}

export interface Preferences {
  days: Weekday[]
  period: Period
  note?: string
}

export interface ExamRequest {
  id: string
  protocol: string
  patientId: string
  createdAt: string
  status: RequestStatus
  /** pedido original do paciente — nunca é alterado */
  requestedExamIds: string[]
  items: RequestItem[]
  preferences: Preferences
  assignedTo?: string
  assignedAt?: string
  scheduledAt?: string
  appointmentIds: string[]
  refusalReason?: string
  events: TimelineEvent[]
}

export type AppointmentStatus = "agendado" | "checkin" | "concluido" | "faltou" | "cancelado"

export interface Appointment {
  id: string
  requestId: string
  patientId: string
  collection: CollectionType
  /** yyyy-MM-dd */
  date: string
  /** HH:mm */
  time: string
  /** HH:mm – fim da janela (entregas) ou do horário */
  endTime: string
  room: string
  status: AppointmentStatus
  examIds: string[]
  createdAt: string
}

export type AlertSeverity = "bloqueio" | "aviso" | "info"

export interface SmartAlert {
  id: string
  severity: AlertSeverity
  title: string
  description: string
  examId?: string
}

export interface StaffUser {
  id: string
  name: string
  shortName: string
  role: string
  initials: string
  color: string
}

export interface SlotInfo {
  collection: CollectionType
  date: string
  time: string
  endTime: string
  capacity: number
  booked: number
  room: string
}

export interface SlotSuggestion extends SlotInfo {
  tags: string[]
  matchesPreference: boolean
}

export interface PrepSummary {
  fastingHours: number
  headline: string
  instructions: string[]
}
