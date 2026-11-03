import { Hourglass, Info, Utensils } from "lucide-react"
import type { PrepSummary } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Bloco de preparo em destaque (o mais restritivo entre os exames). */
export function PrepHighlight({ prep, className, title = "Preparo" }: { prep: PrepSummary; className?: string; title?: string }) {
  const fasting = prep.fastingHours > 0
  return (
    <section
      aria-label="Preparo para os exames"
      className={cn(
        "rounded-2xl p-4 ring-1",
        fasting ? "bg-gradient-to-br from-amber-50 to-orange-50/60 ring-amber-200" : "bg-eco-soft/70 ring-eco/25",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn("inline-flex size-12 shrink-0 items-center justify-center rounded-2xl", fasting ? "bg-amber-100 text-amber-800" : "bg-white text-eco-strong")}>
          {fasting ? <Hourglass className="size-6" /> : <Utensils className="size-6" />}
        </span>
        <div>
          <p className="text-xs font-bold tracking-wide text-subtle uppercase">{title}</p>
          <p className={cn("font-heading text-xl font-bold", fasting ? "text-amber-950" : "text-eco-strong")}>{prep.headline}</p>
        </div>
      </div>
      {prep.instructions.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {prep.instructions.map((t) => (
            <li key={t} className="flex gap-2 text-[15px] leading-snug text-ink/85">
              <Info className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
