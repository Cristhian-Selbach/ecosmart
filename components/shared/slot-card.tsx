import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { fmtDateShort, fmtWeekdayShort } from "@/lib/format"
import type { SlotInfo } from "@/lib/types"

export function OccupancyBar({ booked, capacity, className }: { booked: number; capacity: number; className?: string }) {
  const pct = Math.min(100, (booked / capacity) * 100)
  const tone = booked >= capacity ? "bg-red-400" : pct >= 66 ? "bg-amber-400" : "bg-eco"
  return (
    <span
      className={cn("block h-1.5 w-full overflow-hidden rounded-full bg-slate-100", className)}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={capacity}
      aria-valuenow={booked}
      aria-label={`${booked} de ${capacity} vagas ocupadas`}
    >
      <span className={cn("block h-full rounded-full transition-all duration-300", tone)} style={{ width: `${pct}%` }} />
    </span>
  )
}

export function SlotCard({
  slot,
  selected,
  onSelect,
  tags = [],
  disabled,
  showDate = true,
}: {
  slot: SlotInfo
  selected?: boolean
  onSelect?: () => void
  tags?: string[]
  disabled?: boolean
  showDate?: boolean
}) {
  const full = slot.booked >= slot.capacity
  const left = slot.capacity - slot.booked
  const isWindow = slot.collection !== "sangue"
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled || full}
      aria-pressed={selected}
      className={cn(
        "group relative flex w-full flex-col gap-2 rounded-xl border bg-white p-3 text-left transition-all duration-150",
        "hover:-translate-y-px hover:border-brand/50 hover:shadow-soft",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none",
        selected ? "border-eco bg-eco-soft/60 ring-2 ring-eco/30" : "border-line",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          {showDate && (
            <p className="text-xs font-medium text-subtle capitalize">
              {fmtWeekdayShort(slot.date)}, {fmtDateShort(slot.date)}
            </p>
          )}
          <p className="font-heading text-lg leading-tight font-bold text-ink tabular-nums">
            {slot.time}
            {isWindow && <span className="text-sm font-semibold text-subtle">–{slot.endTime}</span>}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-full border transition-colors",
            selected ? "border-eco bg-eco text-white" : "border-line text-transparent group-hover:border-brand/40",
          )}
          aria-hidden
        >
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      </div>
      <div className="space-y-1">
        <OccupancyBar booked={slot.booked} capacity={slot.capacity} />
        <p className="text-[11px] font-medium text-subtle">
          {full ? "Lotado" : `${left} ${left === 1 ? "vaga" : "vagas"} · ${slot.booked}/${slot.capacity}`}
        </p>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <span
              key={t}
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                t === "Fora da preferência" ? "bg-slate-100 text-slate-600" : "bg-eco-soft text-eco-strong",
              )}
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}
