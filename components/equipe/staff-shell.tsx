"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  CalendarDays,
  ChevronDown,
  ExternalLink,
  FlaskConical,
  Inbox,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Search,
  Users,
  UserRound,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { BrandMark, PositivoLogo, Wordmark } from "@/components/shared/brand"
import { StatusBadge } from "@/components/shared/status-badge"
import { useFresh } from "@/components/equipe/fresh-store"
import { STAFF } from "@/lib/mock-data"
import { activeExamIds } from "@/lib/rules"
import { useCurrentStaff, useData, useHydrated, useSession } from "@/lib/store"
import { ageFrom, formatCPF, formatPhone, pluralize } from "@/lib/format"
import { isTypingTarget } from "@/lib/hooks"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/equipe/fila", label: "Fila de solicitações", Icon: Inbox, badge: true },
  { href: "/equipe/agenda", label: "Agenda", Icon: CalendarDays },
  { href: "/equipe/pacientes", label: "Pacientes", Icon: Users },
  { href: "/equipe/exames", label: "Exames", Icon: FlaskConical },
  { href: "/equipe/dashboard", label: "Dashboard", Icon: LayoutDashboard },
]

export function StaffShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const hydrated = useHydrated()
  const staff = useCurrentStaff()
  const staffId = useSession((s) => s.staffId)
  const collapsed = useSession((s) => s.sidebarCollapsed)
  const toggleSidebar = useSession((s) => s.toggleSidebar)
  const setStaff = useSession((s) => s.setStaff)
  const requests = useData((s) => s.requests)
  const patients = useData((s) => s.patients)
  const reset = useData((s) => s.reset)
  const addFresh = useFresh((s) => s.add)
  const [searchOpen, setSearchOpen] = useState(false)
  const seen = useRef<Set<string> | null>(null)

  const pendingCount = requests.filter((r) => r.status === "pendente").length

  useEffect(() => {
    if (hydrated && !staffId) router.replace("/equipe/entrar")
  }, [hydrated, staffId, router])

  // Detecta novas solicitações vindas de outra aba (paciente)
  useEffect(() => {
    if (!hydrated) return
    if (!seen.current) {
      seen.current = new Set(requests.map((r) => r.id))
      return
    }
    for (const r of requests) {
      if (seen.current.has(r.id)) continue
      seen.current.add(r.id)
      if (r.status !== "pendente") continue
      const p = patients.find((x) => x.id === r.patientId)
      addFresh(r.id)
      toast("Nova solicitação na fila", {
        description: `${p?.name ?? "Paciente"} · ${pluralize(activeExamIds(r).length, "exame", "exames")}`,
        icon: <Inbox className="size-4 text-eco-strong" />,
        action: { label: "Ver", onClick: () => router.push(`/equipe/fila?id=${r.id}`) },
        duration: 8000,
      })
    }
  }, [requests, patients, hydrated, addFresh, router])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !isTypingTarget(e.target))) {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  if (!hydrated || !staff) return <ShellSkeleton />

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r border-line bg-white transition-[width] duration-200 ease-out",
          collapsed ? "w-[76px]" : "w-64",
        )}
        aria-label="Navegação principal"
      >
        <div className={cn("flex h-16 items-center border-b border-line", collapsed ? "justify-center" : "px-5")}>
          <Link href="/equipe/fila" aria-label="EcoSmart Saúde">
            {collapsed ? <BrandMark size={34} /> : <Wordmark size={34} />}
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ href, label, Icon, badge }) => {
            const active = pathname.startsWith(href)
            const link = (
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-11 items-center gap-3 rounded-xl text-sm font-medium transition-colors duration-150",
                  collapsed ? "justify-center" : "px-3",
                  active ? "bg-navy text-white shadow-sm" : "text-ink/70 hover:bg-canvas hover:text-ink",
                )}
              >
                <Icon className="size-[18px] shrink-0" aria-hidden />
                {!collapsed && <span className="flex-1 truncate">{label}</span>}
                {badge && pendingCount > 0 && (
                  <span
                    className={cn(
                      "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums",
                      active ? "bg-white text-navy" : "bg-amber-400 text-amber-950",
                      collapsed && "absolute top-1 right-2 h-4 min-w-4 px-1 text-[10px]",
                    )}
                    aria-label={`${pendingCount} pendentes`}
                  >
                    {pendingCount}
                  </span>
                )}
              </Link>
            )
            return collapsed ? (
              <Tooltip key={href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            ) : (
              <div key={href}>{link}</div>
            )
          })}
        </nav>
        <div className="space-y-1 border-t border-line p-3">
          {!collapsed && (
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-canvas px-3 py-2.5">
              <PositivoLogo variant="star" className="h-5 w-5" />
              <span className="text-[11px] leading-tight text-subtle">
                Universidade Positivo
                <br />
                Clínica LEAC
              </span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-xl text-sm text-subtle transition-colors hover:bg-canvas hover:text-ink",
              collapsed ? "justify-center" : "px-3",
            )}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
            {!collapsed && "Recolher menu"}
          </button>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-line bg-white/90 px-6 backdrop-blur">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-10 w-full max-w-md items-center gap-2 rounded-xl border border-line bg-canvas px-3 text-sm text-subtle transition-colors hover:border-brand/40"
          >
            <Search className="size-4" />
            <span className="flex-1 text-left">Buscar paciente, CPF, telefone ou protocolo…</span>
            <kbd>Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/paciente/entrar"
              target="_blank"
              className="hidden h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-subtle transition-colors hover:bg-canvas hover:text-navy xl:inline-flex"
            >
              <ExternalLink className="size-4" /> Visão do paciente
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-11 items-center gap-2.5 rounded-xl pr-2 pl-1.5 transition-colors hover:bg-canvas">
                  <span className="inline-flex size-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: staff.color }}>
                    {staff.initials}
                  </span>
                  <span className="hidden text-left leading-tight md:block">
                    <span className="block text-sm font-semibold text-ink">{staff.name}</span>
                    <span className="block text-xs text-subtle">{staff.role}</span>
                  </span>
                  <ChevronDown className="size-4 text-subtle" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-xs font-semibold text-subtle">Trocar usuário (demo)</DropdownMenuLabel>
                {STAFF.map((u) => (
                  <DropdownMenuItem
                    key={u.id}
                    onSelect={() => {
                      setStaff(u.id)
                      toast.success(`Agora você é ${u.name}`)
                    }}
                    className={cn(u.id === staff.id && "bg-canvas")}
                  >
                    <span className="inline-flex size-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: u.color }}>
                      {u.initials}
                    </span>
                    <span className="flex-1">{u.name}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    reset()
                    seen.current = null
                    toast.success("Dados da demonstração reiniciados")
                  }}
                >
                  <RotateCcw /> Reiniciar dados da demo
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => {
                    setStaff(undefined)
                    router.push("/equipe/entrar")
                  }}
                >
                  <LogOut /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen} title="Busca global" description="Busque pacientes e solicitações">
        <CommandInput placeholder="Nome, CPF, telefone ou protocolo…" />
        <CommandList className="max-h-[420px]">
          <CommandEmpty>Nada encontrado.</CommandEmpty>
          <CommandGroup heading="Pacientes">
            {patients.map((p) => (
              <CommandItem
                key={p.id}
                value={`${p.name} ${p.cpf} ${formatCPF(p.cpf)} ${p.phone} ${formatPhone(p.phone)}`}
                onSelect={() => {
                  setSearchOpen(false)
                  router.push(`/equipe/pacientes?id=${p.id}`)
                }}
              >
                <UserRound className="text-subtle" />
                <span className="flex-1">{p.name}</span>
                <span className="text-xs text-subtle">
                  {ageFrom(p.birthDate)} anos · {formatCPF(p.cpf)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Solicitações">
            {[...requests]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 40)
              .map((r) => {
                const p = patients.find((x) => x.id === r.patientId)
                return (
                  <CommandItem
                    key={r.id}
                    value={`${r.protocol} ${p?.name ?? ""}`}
                    onSelect={() => {
                      setSearchOpen(false)
                      router.push(`/equipe/fila?id=${r.id}`)
                    }}
                  >
                    <Inbox className="text-subtle" />
                    <span className="font-mono text-xs">{r.protocol}</span>
                    <span className="flex-1 truncate">{p?.name}</span>
                    <StatusBadge status={r.status} />
                  </CommandItem>
                )
              })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  )
}

function ShellSkeleton() {
  return (
    <div className="flex h-dvh" aria-busy="true" aria-label="Carregando">
      <div className="w-64 space-y-3 border-r border-line bg-white p-4">
        <Skeleton className="h-9 w-40 rounded-lg" />
        <div className="space-y-2 pt-6">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex h-16 items-center border-b border-line bg-white px-6">
          <Skeleton className="h-10 w-96 rounded-xl" />
        </div>
        <div className="grid grid-cols-[340px_1fr_380px] gap-4 p-6">
          <Skeleton className="h-[70vh] rounded-2xl" />
          <Skeleton className="h-[70vh] rounded-2xl" />
          <Skeleton className="h-[70vh] rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
