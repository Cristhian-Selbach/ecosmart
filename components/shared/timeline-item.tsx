import {
  ArrowLeftRight,
  Ban,
  CalendarCheck,
  CalendarClock,
  CircleCheck,
  CircleX,
  Send,
  Trash,
  Undo2,
  UserCheck,
  UserX,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { fmtDateTime } from "@/lib/format"
import type { TimelineEvent, TimelineType } from "@/lib/types"

const ICONS: Record<TimelineType, { Icon: typeof Send; cls: string }> = {
  criada: { Icon: Send, cls: "bg-brand-soft text-brand" },
  assumida: { Icon: UserCheck, cls: "bg-blue-100 text-blue-700" },
  liberada: { Icon: Undo2, cls: "bg-slate-100 text-slate-600" },
  exame_trocado: { Icon: ArrowLeftRight, cls: "bg-amber-100 text-amber-800" },
  exame_removido: { Icon: Trash, cls: "bg-amber-100 text-amber-800" },
  agendada: { Icon: CalendarCheck, cls: "bg-eco-soft text-eco-strong" },
  recusada: { Icon: Ban, cls: "bg-red-100 text-red-700" },
  cancelada: { Icon: CircleX, cls: "bg-red-100 text-red-700" },
  checkin: { Icon: UserCheck, cls: "bg-sky-100 text-sky-700" },
  concluido: { Icon: CircleCheck, cls: "bg-teal-100 text-teal-700" },
  faltou: { Icon: UserX, cls: "bg-slate-200 text-slate-700" },
  remarcado: { Icon: CalendarClock, cls: "bg-blue-100 text-blue-700" },
}

export function TimelineItem({ event, last = false }: { event: TimelineEvent; last?: boolean }) {
  const s = ICONS[event.type]
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!last && <span className="absolute top-8 bottom-0 left-[15px] w-px bg-line" aria-hidden />}
      <span className={cn("relative z-10 inline-flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white", s.cls)}>
        <s.Icon className="size-3.5" aria-hidden />
      </span>
      <div className="min-w-0 pt-1">
        <p className="text-sm leading-snug font-medium text-ink">{event.title}</p>
        {event.detail && <p className="mt-0.5 text-[13px] text-ink/70">{event.detail}</p>}
        <p className="mt-0.5 text-xs text-subtle">
          {fmtDateTime(event.at)}
          {event.actor && <> · {event.actor}</>}
        </p>
      </div>
    </li>
  )
}

export function Timeline({ events, className, newestFirst = false }: { events: TimelineEvent[]; className?: string; newestFirst?: boolean }) {
  const list = [...events].sort((a, b) => (newestFirst ? b.at.localeCompare(a.at) : a.at.localeCompare(b.at)))
  return (
    <ol className={cn("relative", className)}>
      {list.map((e, i) => (
        <TimelineItem key={e.id} event={e} last={i === list.length - 1} />
      ))}
    </ol>
  )
}
