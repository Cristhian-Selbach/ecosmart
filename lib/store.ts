"use client"

import { create } from "zustand"
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware"
import { format } from "date-fns"
import { COLLECTION_META, EXAMS, SCHEDULE, STAFF, addMinutesStr, buildSeed } from "./mock-data"
import { groupByCollection } from "./rules"
import type {
  Appointment,
  ChangeReason,
  CollectionType,
  Exam,
  ExamRequest,
  Patient,
  Preferences,
  TimelineEvent,
} from "./types"

export const DATA_KEY = "ecosmart-saude:data:v1"

export const REASON_LABEL: Record<ChangeReason, string> = {
  escolha_errada: "Paciente escolheu errado",
  indisponivel: "Exame indisponível",
  equivalente: "Substituído por equivalente",
  duplicado: "Duplicado",
  outro: "Outro",
}

const rid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
const nowIso = () => new Date().toISOString()
const staffName = (id: string) => STAFF.find((s) => s.id === id)?.name ?? "Equipe"

/** Só grava se o valor mudou — evita "ping-pong" do evento storage entre abas. */
const dedupedLocalStorage: StateStorage = {
  getItem: (k) => localStorage.getItem(k),
  setItem: (k, v) => {
    if (localStorage.getItem(k) !== v) localStorage.setItem(k, v)
  },
  removeItem: (k) => localStorage.removeItem(k),
}

export interface NewPatientInput {
  cpf: string
  name: string
  birthDate: string
  sex: "F" | "M"
  phone: string
  email?: string
  motherName?: string
  link: "comunidade" | "aluno"
  neighborhood?: string
}

export interface SlotChoice {
  collection: CollectionType
  date: string
  time: string
  endTime: string
}

interface DataState {
  seeded: boolean
  seededAt?: string
  patients: Patient[]
  requests: ExamRequest[]
  appointments: Appointment[]
  exams: Exam[]
  protocolSeq: number

  seed: () => void
  reset: () => void

  registerPatient: (input: NewPatientInput) => Patient
  createRequest: (patientId: string, examIds: string[], prefs: Preferences) => ExamRequest
  cancelRequest: (requestId: string, by: "paciente" | string) => void

  claimRequest: (requestId: string, staffId: string) => void
  releaseRequest: (requestId: string, staffId: string) => void
  swapExam: (requestId: string, itemId: string, newExamId: string, reason: ChangeReason, note: string | undefined, staffId: string) => void
  removeExam: (requestId: string, itemId: string, reason: ChangeReason, note: string | undefined, staffId: string) => void
  undoChange: (requestId: string, itemId: string, staffId: string) => void
  scheduleRequest: (requestId: string, choices: SlotChoice[], staffId: string) => void
  refuseRequest: (requestId: string, reason: string, staffId: string) => void

  setAppointmentStatus: (appointmentId: string, status: Appointment["status"], staffId: string) => void
  rescheduleAppointment: (appointmentId: string, date: string, time: string, staffId: string) => void

  updateExam: (exam: Exam) => void
  toggleExam: (examId: string) => void
}

const ev = (type: TimelineEvent["type"], title: string, actor?: string, detail?: string): TimelineEvent => ({
  id: rid("ev"),
  at: nowIso(),
  type,
  title,
  actor,
  detail,
})

export const useData = create<DataState>()(
  persist(
    (set, get) => {
      const patchRequest = (id: string, fn: (r: ExamRequest) => ExamRequest) =>
        set((s) => ({ requests: s.requests.map((r) => (r.id === id ? fn(r) : r)) }))
      const examName = (id: string) => get().exams.find((e) => e.id === id)?.name ?? id

      return {
        seeded: false,
        patients: [],
        requests: [],
        appointments: [],
        exams: EXAMS,
        protocolSeq: 1,

        seed: () => set({ ...buildSeed(new Date()), seeded: true, seededAt: nowIso() }),
        reset: () => set({ ...buildSeed(new Date()), seeded: true, seededAt: nowIso() }),

        registerPatient: (input) => {
          const p: Patient = {
            id: rid("pac"),
            ...input,
            neighborhood: input.neighborhood || "Não informado",
            createdAt: nowIso(),
            consentAt: nowIso(),
            history: [],
          }
          set((s) => ({ patients: [...s.patients, p] }))
          return p
        },

        createRequest: (patientId, examIds, prefs) => {
          const seq = get().protocolSeq
          const req: ExamRequest = {
            id: rid("req"),
            protocol: `CLN-${format(new Date(), "ddMM")}-${String(seq).padStart(4, "0")}`,
            patientId,
            createdAt: nowIso(),
            status: "pendente",
            requestedExamIds: [...examIds],
            items: examIds.map((examId) => ({ id: rid("it"), examId, status: "ativo" as const })),
            preferences: prefs,
            appointmentIds: [],
            events: [ev("criada", "Solicitação enviada pelo paciente", "Paciente")],
          }
          set((s) => ({ requests: [...s.requests, req], protocolSeq: seq + 1 }))
          return req
        },

        cancelRequest: (requestId, by) => {
          const actor = by === "paciente" ? "Paciente" : staffName(by)
          set((s) => ({
            appointments: s.appointments.map((a) =>
              a.requestId === requestId && ["agendado", "checkin"].includes(a.status) ? { ...a, status: "cancelado" } : a,
            ),
            requests: s.requests.map((r) =>
              r.id === requestId
                ? { ...r, status: "cancelada", events: [...r.events, ev("cancelada", "Agendamento cancelado", actor)] }
                : r,
            ),
          }))
        },

        claimRequest: (requestId, staffId) =>
          patchRequest(requestId, (r) => ({
            ...r,
            status: r.status === "pendente" || r.status === "em_analise" ? "em_analise" : r.status,
            assignedTo: staffId,
            assignedAt: nowIso(),
            events: [...r.events, ev("assumida", `Assumida por ${staffName(staffId)}`, staffName(staffId))],
          })),

        releaseRequest: (requestId, staffId) =>
          patchRequest(requestId, (r) => ({
            ...r,
            status: "pendente",
            assignedTo: undefined,
            assignedAt: undefined,
            events: [...r.events, ev("liberada", "Devolvida para a fila", staffName(staffId))],
          })),

        swapExam: (requestId, itemId, newExamId, reason, note, staffId) =>
          patchRequest(requestId, (r) => {
            const old = r.items.find((i) => i.id === itemId)
            if (!old) return r
            const newId = rid("it")
            const meta = { reason, reasonNote: note, changedBy: staffId, changedAt: nowIso() }
            return {
              ...r,
              items: [
                ...r.items.map((i) => (i.id === itemId ? { ...i, status: "trocado" as const, replacedBy: newId, ...meta } : i)),
                { id: newId, examId: newExamId, status: "ativo" as const, replaces: itemId, addedByStaff: true, ...meta },
              ],
              events: [
                ...r.events,
                ev(
                  "exame_trocado",
                  `Exame alterado: ${examName(old.examId)} → ${examName(newExamId)}`,
                  staffName(staffId),
                  `Motivo: ${REASON_LABEL[reason]}${note ? ` — ${note}` : ""}`,
                ),
              ],
            }
          }),

        removeExam: (requestId, itemId, reason, note, staffId) =>
          patchRequest(requestId, (r) => {
            const old = r.items.find((i) => i.id === itemId)
            if (!old) return r
            return {
              ...r,
              items: r.items.map((i) =>
                i.id === itemId
                  ? { ...i, status: "removido" as const, reason, reasonNote: note, changedBy: staffId, changedAt: nowIso() }
                  : i,
              ),
              events: [
                ...r.events,
                ev(
                  "exame_removido",
                  `Exame removido: ${examName(old.examId)}`,
                  staffName(staffId),
                  `Motivo: ${REASON_LABEL[reason]}${note ? ` — ${note}` : ""}`,
                ),
              ],
            }
          }),

        undoChange: (requestId, itemId, staffId) =>
          patchRequest(requestId, (r) => {
            const item = r.items.find((i) => i.id === itemId)
            if (!item || item.status === "ativo") return r
            let items = r.items
            if (item.status === "trocado" && item.replacedBy) items = items.filter((i) => i.id !== item.replacedBy)
            items = items.map((i) =>
              i.id === itemId
                ? { id: i.id, examId: i.examId, status: "ativo" as const, replaces: i.replaces, addedByStaff: i.addedByStaff }
                : i,
            )
            return {
              ...r,
              items,
              events: [...r.events, ev("exame_trocado", `Alteração desfeita: ${examName(item.examId)} restaurado`, staffName(staffId))],
            }
          }),

        scheduleRequest: (requestId, choices, staffId) => {
          const r = get().requests.find((x) => x.id === requestId)
          if (!r) return
          const active = r.items.filter((i) => i.status === "ativo").map((i) => i.examId)
          const groups = groupByCollection(active, get().exams)
          const created: Appointment[] = groups.map((g) => {
            const c = choices.find((x) => x.collection === g.collection)!
            return {
              id: rid("ap"),
              requestId,
              patientId: r.patientId,
              collection: g.collection,
              date: c.date,
              time: c.time,
              endTime: c.endTime,
              room: COLLECTION_META[g.collection].room,
              status: "agendado",
              examIds: g.exams.map((e) => e.id),
              createdAt: nowIso(),
            }
          })
          set((s) => ({
            appointments: [...s.appointments, ...created],
            requests: s.requests.map((x) =>
              x.id === requestId
                ? {
                    ...x,
                    status: "agendada",
                    scheduledAt: nowIso(),
                    assignedTo: x.assignedTo ?? staffId,
                    appointmentIds: created.map((a) => a.id),
                    events: [
                      ...x.events,
                      ...created.map((a) =>
                        ev(
                          "agendada",
                          `${COLLECTION_META[a.collection].label} agendada`,
                          staffName(staffId),
                          `${format(new Date(`${a.date}T00:00:00`), "dd/MM/yyyy")} · ${a.time}${a.collection !== "sangue" ? `–${a.endTime}` : ""}`,
                        ),
                      ),
                    ],
                  }
                : x,
            ),
          }))
        },

        refuseRequest: (requestId, reason, staffId) =>
          patchRequest(requestId, (r) => ({
            ...r,
            status: "recusada",
            refusalReason: reason,
            assignedTo: r.assignedTo ?? staffId,
            events: [...r.events, ev("recusada", "Solicitação recusada", staffName(staffId), `Motivo: ${reason}`)],
          })),

        setAppointmentStatus: (appointmentId, status, staffId) => {
          const a = get().appointments.find((x) => x.id === appointmentId)
          if (!a) return
          const labels: Record<string, [TimelineEvent["type"], string]> = {
            checkin: ["checkin", "Check-in realizado"],
            concluido: ["concluido", `${COLLECTION_META[a.collection].action} concluída`],
            faltou: ["faltou", "Paciente não compareceu"],
            cancelado: ["cancelada", "Agendamento cancelado pela equipe"],
            agendado: ["remarcado", "Status revertido para agendado"],
          }
          const [type, title] = labels[status]
          set((s) => ({
            appointments: s.appointments.map((x) => (x.id === appointmentId ? { ...x, status } : x)),
            requests: s.requests.map((r) =>
              r.id === a.requestId
                ? { ...r, events: [...r.events, ev(type, title, staffName(staffId), `${COLLECTION_META[a.collection].label} · ${a.time}`)] }
                : r,
            ),
          }))
        },

        rescheduleAppointment: (appointmentId, date, time, staffId) => {
          const a = get().appointments.find((x) => x.id === appointmentId)
          if (!a) return
          const endTime =
            a.collection === "sangue"
              ? addMinutesStr(time, SCHEDULE.bloodDuration)
              : (SCHEDULE.sampleWindows.find((w) => w[0] === time)?.[1] ?? time)
          set((s) => ({
            appointments: s.appointments.map((x) => (x.id === appointmentId ? { ...x, date, time, endTime, status: "agendado" } : x)),
            requests: s.requests.map((r) =>
              r.id === a.requestId
                ? {
                    ...r,
                    events: [
                      ...r.events,
                      ev(
                        "remarcado",
                        `${COLLECTION_META[a.collection].label} remarcada`,
                        staffName(staffId),
                        `${format(new Date(`${a.date}T00:00:00`), "dd/MM")} ${a.time} → ${format(new Date(`${date}T00:00:00`), "dd/MM")} ${time}`,
                      ),
                    ],
                  }
                : r,
            ),
          }))
        },

        updateExam: (exam) => set((s) => ({ exams: s.exams.map((e) => (e.id === exam.id ? exam : e)) })),
        toggleExam: (examId) => set((s) => ({ exams: s.exams.map((e) => (e.id === examId ? { ...e, active: !e.active } : e)) })),
      }
    },
    {
      name: DATA_KEY,
      storage: createJSONStorage(() => dedupedLocalStorage),
      skipHydration: true,
      partialize: (s) => ({
        seeded: s.seeded,
        seededAt: s.seededAt,
        patients: s.patients,
        requests: s.requests,
        appointments: s.appointments,
        exams: s.exams,
        protocolSeq: s.protocolSeq,
      }),
    },
  ),
)

// ───────────── Sessão (por aba, em sessionStorage) ─────────────

interface SessionState {
  patientId?: string
  staffId?: string
  sidebarCollapsed: boolean
  setPatient: (id?: string) => void
  setStaff: (id?: string) => void
  toggleSidebar: () => void
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      setPatient: (patientId) => set({ patientId }),
      setStaff: (staffId) => set({ staffId }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: "ecosmart-saude:session",
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
    },
  ),
)

// ───────────── Hidratação ─────────────

export const useHydration = create<{ hydrated: boolean; setHydrated: () => void }>()((set) => ({
  hydrated: false,
  setHydrated: () => set({ hydrated: true }),
}))

export const useHydrated = () => useHydration((s) => s.hydrated)

// ───────────── Seletores utilitários ─────────────

export const usePatient = (id?: string) => useData((s) => (id ? s.patients.find((p) => p.id === id) : undefined))
export const useCurrentStaff = () => {
  const staffId = useSession((s) => s.staffId)
  return STAFF.find((s) => s.id === staffId)
}
