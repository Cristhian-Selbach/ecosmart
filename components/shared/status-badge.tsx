import { cn } from "@/lib/utils"
import type { AppointmentStatus, RequestStatus } from "@/lib/types"

type AnyStatus = RequestStatus | AppointmentStatus

const MAP: Record<AnyStatus, { label: string; cls: string; dot: string }> = {
  pendente: { label: "Pendente", cls: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  em_analise: { label: "Em análise", cls: "bg-blue-50 text-blue-800 ring-blue-200", dot: "bg-blue-500" },
  agendada: { label: "Agendada", cls: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  agendado: { label: "Agendado", cls: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  checkin: { label: "Check-in", cls: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-500" },
  concluido: { label: "Concluído", cls: "bg-teal-50 text-teal-800 ring-teal-200", dot: "bg-teal-600" },
  recusada: { label: "Recusada", cls: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500" },
  cancelada: { label: "Cancelada", cls: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-400" },
  cancelado: { label: "Cancelado", cls: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-400" },
  faltou: { label: "Faltou", cls: "bg-slate-100 text-slate-700 ring-slate-200", dot: "bg-slate-400" },
}

export function StatusBadge({ status, className, label }: { status: AnyStatus; className?: string; label?: string }) {
  const m = MAP[status]
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset",
        m.cls,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", m.dot)} aria-hidden />
      {label ?? m.label}
    </span>
  )
}

export const statusDot = (status: AnyStatus) => MAP[status].dot
export const statusLabel = (status: AnyStatus) => MAP[status].label
