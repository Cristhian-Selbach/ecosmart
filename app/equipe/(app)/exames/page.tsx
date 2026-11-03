"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Hourglass, Lock, Pencil, Search, ShieldAlert, FlaskConical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { CollectionBadge } from "@/components/shared/exam-chip"
import { EmptyState } from "@/components/shared/empty-state"
import { EXAM_GROUP_ORDER } from "@/lib/mock-data"
import { useData } from "@/lib/store"
import type { CollectionType, Exam } from "@/lib/types"
import { cn } from "@/lib/utils"

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

export default function ExamesPage() {
  const exams = useData((s) => s.exams)
  const toggleExam = useData((s) => s.toggleExam)
  const updateExam = useData((s) => s.updateExam)
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<Exam>()

  const groups = useMemo(() => {
    const t = norm(q.trim())
    const list = exams.filter((e) => !t || norm(`${e.name} ${e.popularName} ${e.group}`).includes(t))
    return EXAM_GROUP_ORDER.map((g) => ({ g, list: list.filter((e) => e.group === g) })).filter((x) => x.list.length)
  }, [exams, q])
  const activeCount = exams.filter((e) => e.active).length

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Exames</h1>
          <p className="text-sm text-subtle">
            {activeCount} de {exams.length} exames ativos para solicitação
          </p>
        </div>
        <div className="relative w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar exame" className="pl-9" aria-label="Buscar exame" />
        </div>
      </div>

      <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200">
        <ShieldAlert className="size-4 shrink-0" />
        Preparos e tempos de jejum são fictícios nesta demonstração e devem ser validados pelos supervisores da LEAC.
      </p>

      {groups.length === 0 ? (
        <EmptyState icon={FlaskConical} title="Nenhum exame encontrado" description="Tente outro termo de busca." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {groups.map(({ g, list }) => (
            <section key={g} className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
              <header className="flex items-center justify-between border-b border-line bg-canvas/60 px-4 py-2.5">
                <h2 className="font-heading text-sm font-bold text-ink">{g}</h2>
                <CollectionBadge collection={list[0].collection} />
              </header>
              <ul className="divide-y divide-line">
                {list.map((e) => (
                  <li key={e.id} className={cn("flex items-center gap-3 px-4 py-3 transition-opacity", !e.active && "opacity-55")}>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                        {e.name}
                        {e.sensitive && <Lock className="size-3.5 text-subtle" aria-label="Sensível" />}
                      </p>
                      <p className="truncate text-xs text-subtle">
                        {e.popularName}
                        {e.fastingHours > 0 && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 font-medium text-navy">
                            <Hourglass className="size-3" /> {e.fastingHours}h
                          </span>
                        )}
                        {e.allowedSex && <span className="ml-1.5 font-medium">· somente {e.allowedSex === "M" ? "masculino" : "feminino"}</span>}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(e)} aria-label={`Editar ${e.name}`}>
                      <Pencil />
                    </Button>
                    <Switch
                      checked={e.active}
                      onCheckedChange={() => {
                        toggleExam(e.id)
                        toast.success(`${e.name} ${e.active ? "desativado" : "ativado"}`)
                      }}
                      aria-label={`${e.active ? "Desativar" : "Ativar"} ${e.name}`}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <EditExamDialog
        exam={editing}
        onClose={() => setEditing(undefined)}
        onSave={(e) => {
          updateExam(e)
          toast.success("Exame atualizado", { description: e.name })
          setEditing(undefined)
        }}
      />
    </div>
  )
}

function EditExamDialog({ exam, onClose, onSave }: { exam?: Exam; onClose: () => void; onSave: (e: Exam) => void }) {
  const [draft, setDraft] = useState<Exam>()
  useEffect(() => setDraft(exam ? { ...exam } : undefined), [exam])
  const set = <K extends keyof Exam>(k: K, v: Exam[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d))

  return (
    <Dialog open={!!exam} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="gap-5 rounded-2xl sm:max-w-xl">
        {draft && (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Editar exame</DialogTitle>
              <DialogDescription>{draft.name}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="ex-pop">Nome popular</Label>
                <Input id="ex-pop" value={draft.popularName} onChange={(e) => set("popularName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ex-group">Grupo</Label>
                <Select value={draft.group} onValueChange={(v) => set("group", v)}>
                  <SelectTrigger id="ex-group" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAM_GROUP_ORDER.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ex-col">Tipo de coleta</Label>
                <Select value={draft.collection} onValueChange={(v) => set("collection", v as CollectionType)}>
                  <SelectTrigger id="ex-col" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sangue">Sangue</SelectItem>
                    <SelectItem value="urina">Urina</SelectItem>
                    <SelectItem value="fezes">Fezes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ex-fast">Horas de jejum</Label>
                <Input id="ex-fast" type="number" min={0} max={14} inputMode="numeric" value={draft.fastingHours} onChange={(e) => set("fastingHours", Math.max(0, Math.min(14, Number(e.target.value) || 0)))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ex-age">Idade mínima</Label>
                <Input id="ex-age" type="number" min={0} inputMode="numeric" value={draft.minAge ?? ""} placeholder="Sem restrição" onChange={(e) => set("minAge", e.target.value ? Number(e.target.value) : undefined)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ex-sex">Sexo permitido</Label>
                <Select value={draft.allowedSex ?? "todos"} onValueChange={(v) => set("allowedSex", v === "todos" ? undefined : (v as "F" | "M"))}>
                  <SelectTrigger id="ex-sex" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="F">Somente feminino</SelectItem>
                    <SelectItem value="M">Somente masculino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center justify-between gap-3 self-end rounded-xl border border-line px-3 py-2.5">
                <span className="text-sm">
                  <span className="block font-medium text-ink">Exame sensível</span>
                  <span className="block text-xs text-subtle">Exibido de forma discreta</span>
                </span>
                <Switch checked={draft.sensitive} onCheckedChange={(v) => set("sensitive", v)} />
              </label>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="ex-prep">Instruções de preparo</Label>
                <Textarea id="ex-prep" value={draft.prep} onChange={(e) => set("prep", e.target.value)} className="min-h-20" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={() => onSave(draft)} disabled={!draft.popularName.trim()}>
                Salvar alterações
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
