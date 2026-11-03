"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { ArrowLeft, CalendarDays, LogOut, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Wordmark } from "@/components/shared/brand"
import { useData, useHydrated, useSession } from "@/lib/store"
import { firstName, initials } from "@/lib/format"
import { cn } from "@/lib/utils"

export function PatientHeader({ back, title }: { back?: string; title?: string }) {
  const router = useRouter()
  const patientId = useSession((s) => s.patientId)
  const setPatient = useSession((s) => s.setPatient)
  const patient = useData((s) => s.patients.find((p) => p.id === patientId))

  return (
    <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line/70 bg-white/85 px-3 backdrop-blur-md">
      {back ? (
        <Button variant="ghost" size="icon-lg" asChild aria-label="Voltar">
          <Link href={back}>
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
      ) : (
        <Link href="/" className="rounded-lg px-1" aria-label="Início">
          <Wordmark size={32} />
        </Link>
      )}
      {title && <h1 className="flex-1 truncate font-heading text-lg font-bold text-ink">{title}</h1>}
      {!title && <span className="flex-1" />}
      {patient && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="inline-flex size-11 items-center justify-center rounded-full bg-eco-soft font-heading text-sm font-bold text-eco-strong ring-2 ring-white transition-shadow hover:ring-eco/30"
              aria-label={`Menu de ${patient.name}`}
            >
              {initials(patient.name)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <p className="text-sm font-semibold text-ink">{patient.name}</p>
              <p className="text-xs font-normal text-subtle">Paciente</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="min-h-11 text-base" onSelect={() => router.push("/paciente/agendamentos")}>
              <CalendarDays /> Meus agendamentos
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11 text-base" onSelect={() => router.push("/paciente/solicitar")}>
              <Plus /> Nova solicitação
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="min-h-11 text-base"
              variant="destructive"
              onSelect={() => {
                setPatient(undefined)
                router.push("/paciente/entrar")
              }}
            >
              <LogOut /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  )
}

/** Garante sessão de paciente; devolve o paciente ou null enquanto carrega. */
export function usePatientGuard() {
  const router = useRouter()
  const hydrated = useHydrated()
  const patientId = useSession((s) => s.patientId)
  const patient = useData((s) => s.patients.find((p) => p.id === patientId))
  useEffect(() => {
    if (hydrated && !patient) router.replace("/paciente/entrar")
  }, [hydrated, patient, router])
  return hydrated ? (patient ?? null) : null
}

export function PatientPageSkeleton() {
  return (
    <div className="space-y-4 p-5" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-7 w-2/3 rounded-lg" />
      <Skeleton className="h-4 w-1/2 rounded-lg" />
      <Skeleton className="mt-6 h-28 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
    </div>
  )
}

export function Greeting({ name, className }: { name: string; className?: string }) {
  const h = new Date().getHours()
  const g = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"
  return (
    <p className={cn("text-base text-subtle", className)}>
      {g}, <span className="font-semibold text-ink">{firstName(name)}</span>
    </p>
  )
}
