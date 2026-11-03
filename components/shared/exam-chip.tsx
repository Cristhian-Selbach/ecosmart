"use client"

import { useState } from "react"
import { Droplet, Eye, EyeOff, FlaskConical, Hourglass, Lock, TestTube } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CollectionType, Exam } from "@/lib/types"

const COLLECTION_STYLE: Record<CollectionType, { label: string; cls: string; Icon: typeof Droplet }> = {
  sangue: { label: "Sangue", cls: "bg-rose-50 text-rose-700 ring-rose-200", Icon: Droplet },
  urina: { label: "Urina", cls: "bg-amber-50 text-amber-800 ring-amber-200", Icon: TestTube },
  fezes: { label: "Fezes", cls: "bg-orange-50 text-orange-800 ring-orange-200", Icon: FlaskConical },
}

export function CollectionBadge({ collection, className, withLabel = true }: { collection: CollectionType; className?: string; withLabel?: boolean }) {
  const s = COLLECTION_STYLE[collection]
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium ring-1 ring-inset", s.cls, className)}>
      <s.Icon className="size-3.5" aria-hidden />
      {withLabel && s.label}
    </span>
  )
}

export function CollectionIcon({ collection, className }: { collection: CollectionType; className?: string }) {
  const s = COLLECTION_STYLE[collection]
  return <s.Icon className={className} aria-hidden />
}

export const collectionTone = (c: CollectionType) => COLLECTION_STYLE[c].cls

export function FastingBadge({ hours, className }: { hours: number; className?: string }) {
  if (!hours) return null
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full bg-brand-soft px-2 text-xs font-medium text-navy ring-1 ring-blue-200 ring-inset",
        className,
      )}
    >
      <Hourglass className="size-3.5" aria-hidden />
      Jejum {hours}h
    </span>
  )
}

/** Chip compacto de exame (nome + badges). */
export function ExamChip({ exam, className, discreet = false }: { exam: Exam; className?: string; discreet?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-line bg-white py-1 pr-2.5 pl-1 text-sm", className)}>
      <CollectionBadge collection={exam.collection} withLabel={false} className="h-6 w-6 justify-center px-0" />
      {discreet && exam.sensitive ? <SensitiveName exam={exam} compact /> : <span className="font-medium text-ink">{exam.name}</span>}
    </span>
  )
}

/** Exibe exames sensíveis (HIV, Sífilis) de forma discreta, com opção "mostrar". */
export function SensitiveName({ exam, compact = false, className }: { exam: Exam; compact?: boolean; className?: string }) {
  const [shown, setShown] = useState(false)
  if (!exam.sensitive) return <span className={className}>{exam.name}</span>
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Lock className="size-3.5 text-subtle" aria-hidden />
      <span className={cn("font-medium", !shown && "text-subtle italic")}>{shown ? exam.name : "Exame confidencial"}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setShown((v) => !v)
        }}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1.5 text-xs font-semibold text-brand underline-offset-2 hover:underline",
          compact ? "h-6" : "min-h-8",
        )}
        aria-label={shown ? "Ocultar nome do exame" : "Mostrar nome do exame"}
      >
        {shown ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        {shown ? "ocultar" : "mostrar"}
      </button>
    </span>
  )
}
