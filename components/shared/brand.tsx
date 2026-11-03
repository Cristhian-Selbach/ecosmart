"use client"

import { useState } from "react"
import { Leaf, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

/** Ícone da marca: folha (eco) + cruz (saúde) */
export function BrandMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <span
      aria-hidden
      className={cn("relative inline-flex shrink-0 items-center justify-center rounded-[30%] bg-navy text-white shadow-sm", className)}
      style={{ width: size, height: size }}
    >
      <Leaf style={{ width: size * 0.56, height: size * 0.56 }} strokeWidth={2.2} />
      <span
        className="absolute -right-1 -bottom-1 inline-flex items-center justify-center rounded-full bg-eco ring-2 ring-white"
        style={{ width: size * 0.46, height: size * 0.46 }}
      >
        <Plus style={{ width: size * 0.32, height: size * 0.32 }} strokeWidth={3.2} />
      </span>
    </span>
  )
}

export function Wordmark({ className, size = 36, tagline = false, light = false }: { className?: string; size?: number; tagline?: boolean; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark size={size} />
      <span className="flex flex-col leading-none">
        <span className={cn("font-heading font-bold tracking-tight", light ? "text-white" : "text-navy")} style={{ fontSize: size * 0.5 }}>
          EcoSmart <span className={light ? "text-eco-soft" : "text-eco-strong"}>Saúde</span>
        </span>
        {tagline && (
          <span className={cn("mt-1 text-xs font-medium", light ? "text-white/70" : "text-subtle")}>
            Agendamento inteligente para a clínica LEAC
          </span>
        )}
      </span>
    </span>
  )
}

/** Logo oficial da Universidade Positivo (arquivo fornecido em /public/brand). Nunca recriado. */
export function PositivoLogo({ variant = "full", className }: { variant?: "full" | "star"; className?: string }) {
  const [failed, setFailed] = useState(false)
  const src = variant === "full" ? "/brand/positivo-logo.png" : "/brand/positivo-estrela.png"
  if (failed)
    return (
      <span className={cn("inline-flex items-center text-xs font-semibold tracking-wide text-navy/70 uppercase", className)}>
        Universidade Positivo
      </span>
    )
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Universidade Positivo"
      className={cn(variant === "full" ? "h-7 w-auto" : "h-6 w-6", "object-contain", className)}
      onError={() => setFailed(true)}
    />
  )
}

export function InstitutionalFooter({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <footer className={cn("flex flex-col items-center gap-2 py-6 text-center text-xs text-subtle", className)}>
      <PositivoLogo className={compact ? "h-5" : "h-7"} />
      <p>
        Uma iniciativa <span className="font-medium text-ink/80">Universidade Positivo</span> · Clínica LEAC
      </p>
      {!compact && <p className="text-[11px] text-subtle/80">Protótipo para demonstração · dados fictícios</p>}
    </footer>
  )
}
