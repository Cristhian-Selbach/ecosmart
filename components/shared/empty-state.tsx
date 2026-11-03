import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
      <div className="relative mb-4">
        <span className="absolute inset-0 -m-3 rounded-full bg-eco-soft/70" aria-hidden />
        <span className="relative inline-flex size-14 items-center justify-center rounded-2xl bg-white text-eco-strong shadow-soft ring-1 ring-line">
          <Icon className="size-6" aria-hidden />
        </span>
      </div>
      <p className="font-heading text-base font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-subtle">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
