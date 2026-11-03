import { Ban, Info, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SmartAlert } from "@/lib/types"

const STYLE = {
  bloqueio: { Icon: Ban, cls: "border-red-200 bg-red-50/70", icon: "bg-red-100 text-red-700", title: "text-red-900", tag: "Bloqueio", tagCls: "bg-red-600 text-white" },
  aviso: { Icon: TriangleAlert, cls: "border-amber-200 bg-amber-50/70", icon: "bg-amber-100 text-amber-700", title: "text-amber-950", tag: "Aviso", tagCls: "bg-amber-100 text-amber-800" },
  info: { Icon: Info, cls: "border-blue-100 bg-brand-soft/60", icon: "bg-blue-100 text-brand", title: "text-navy", tag: "Info", tagCls: "bg-blue-100 text-navy" },
}

export function AlertItem({ alert, className }: { alert: SmartAlert; className?: string }) {
  const s = STYLE[alert.severity]
  return (
    <div role={alert.severity === "bloqueio" ? "alert" : undefined} className={cn("flex gap-3 rounded-xl border p-3 animate-enter", s.cls, className)}>
      <span className={cn("mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg", s.icon)}>
        <s.Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm leading-snug font-semibold", s.title)}>{alert.title}</p>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase", s.tagCls)}>{s.tag}</span>
        </div>
        <p className="mt-0.5 text-[13px] leading-relaxed text-ink/70">{alert.description}</p>
      </div>
    </div>
  )
}

export function AlertIcons({ alerts, className }: { alerts: SmartAlert[]; className?: string }) {
  const block = alerts.filter((a) => a.severity === "bloqueio").length
  const warn = alerts.filter((a) => a.severity === "aviso").length
  const info = alerts.filter((a) => a.severity === "info").length
  if (!block && !warn && !info) return null
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {block > 0 && (
        <span title={`${block} bloqueio(s)`} className="inline-flex h-6 items-center gap-0.5 rounded-full bg-red-100 px-1.5 text-[11px] font-bold text-red-700">
          <Ban className="size-3.5" aria-hidden />
          {block}
          <span className="sr-only"> bloqueios</span>
        </span>
      )}
      {warn > 0 && (
        <span title={`${warn} aviso(s)`} className="inline-flex h-6 items-center gap-0.5 rounded-full bg-amber-100 px-1.5 text-[11px] font-bold text-amber-800">
          <TriangleAlert className="size-3.5" aria-hidden />
          {warn}
          <span className="sr-only"> avisos</span>
        </span>
      )}
      {info > 0 && (
        <span title={`${info} informação(ões)`} className="inline-flex h-6 items-center gap-0.5 rounded-full bg-blue-50 px-1.5 text-[11px] font-bold text-brand">
          <Info className="size-3.5" aria-hidden />
          {info}
        </span>
      )}
    </span>
  )
}
