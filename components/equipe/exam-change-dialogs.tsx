"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Check, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CollectionBadge, CollectionIcon, FastingBadge } from "@/components/shared/exam-chip"
import { EXAM_GROUP_ORDER } from "@/lib/mock-data"
import { REASON_LABEL } from "@/lib/store"
import type { ChangeReason, Exam } from "@/lib/types"
import { cn } from "@/lib/utils"

function ReasonFields({
  reason,
  setReason,
  note,
  setNote,
}: {
  reason?: ChangeReason
  setReason: (r: ChangeReason) => void
  note: string
  setNote: (v: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="reason">
          Motivo <span className="text-red-600">*</span>
        </Label>
        <Select value={reason} onValueChange={(v) => setReason(v as ChangeReason)}>
          <SelectTrigger id="reason" className="w-full">
            <SelectValue placeholder="Selecione o motivo" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(REASON_LABEL) as ChangeReason[]).map((r) => (
              <SelectItem key={r} value={r}>
                {REASON_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {reason === "outro" && (
        <div className="space-y-1.5 animate-enter">
          <Label htmlFor="reason-note">
            Descreva o motivo <span className="text-red-600">*</span>
          </Label>
          <Textarea id="reason-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: orientação da preceptora" autoFocus />
        </div>
      )}
      <p className="text-xs text-subtle">O pedido original do paciente é preservado e a alteração fica registrada na linha do tempo.</p>
    </div>
  )
}

export function SwapExamDialog({
  open,
  onOpenChange,
  current,
  exams,
  excludeIds,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  current?: Exam
  exams: Exam[]
  excludeIds: string[]
  onConfirm: (newExamId: string, reason: ChangeReason, note?: string) => void
}) {
  const [target, setTarget] = useState<string>()
  const [reason, setReason] = useState<ChangeReason>()
  const [note, setNote] = useState("")
  useEffect(() => {
    if (open) {
      setTarget(undefined)
      setReason(undefined)
      setNote("")
    }
  }, [open])

  const options = useMemo(() => exams.filter((e) => e.active && !excludeIds.includes(e.id)), [exams, excludeIds])
  const groups = EXAM_GROUP_ORDER.map((g) => ({ g, list: options.filter((e) => e.group === g) })).filter((x) => x.list.length)
  const targetExam = exams.find((e) => e.id === target)
  const valid = !!target && !!reason && (reason !== "outro" || note.trim().length > 2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Trocar exame</DialogTitle>
          <DialogDescription>Escolha o exame correto e informe o motivo da alteração.</DialogDescription>
        </DialogHeader>

        {current && (
          <div className="flex items-center gap-3 rounded-xl bg-canvas p-3 text-sm">
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-subtle">Solicitado</span>
              <span className="block truncate font-semibold text-subtle line-through">{current.name}</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-subtle" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-subtle">Novo exame</span>
              <span className={cn("block truncate font-semibold", targetExam ? "text-eco-strong" : "text-subtle/60")}>
                {targetExam?.name ?? "Selecione abaixo"}
              </span>
            </span>
          </div>
        )}

        <Command className="rounded-xl border border-line">
          <CommandInput placeholder="Buscar exame por nome ou nome popular…" />
          <CommandList className="max-h-56">
            <CommandEmpty>Nenhum exame encontrado.</CommandEmpty>
            {groups.map(({ g, list }) => (
              <CommandGroup key={g} heading={g}>
                {list.map((e) => (
                  <CommandItem key={e.id} value={`${e.name} ${e.popularName}`} onSelect={() => setTarget(e.id)} className="gap-2">
                    <CollectionIcon collection={e.collection} className="size-4 text-subtle" />
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{e.name}</span>
                      <span className="block text-xs text-subtle">{e.popularName}</span>
                    </span>
                    {e.fastingHours > 0 && <span className="text-xs text-subtle">Jejum {e.fastingHours}h</span>}
                    {target === e.id && <Check className="size-4 text-eco" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>

        {targetExam && (
          <div className="flex flex-wrap gap-1.5 animate-enter">
            <CollectionBadge collection={targetExam.collection} />
            <FastingBadge hours={targetExam.fastingHours} />
          </div>
        )}

        <ReasonFields reason={reason} setReason={setReason} note={note} setNote={setNote} />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!valid} onClick={() => valid && onConfirm(target!, reason!, note.trim() || undefined)}>
            Confirmar troca
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function RemoveExamDialog({
  open,
  onOpenChange,
  current,
  onConfirm,
  lastOne,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  current?: Exam
  onConfirm: (reason: ChangeReason, note?: string) => void
  lastOne?: boolean
}) {
  const [reason, setReason] = useState<ChangeReason>()
  const [note, setNote] = useState("")
  useEffect(() => {
    if (open) {
      setReason(undefined)
      setNote("")
    }
  }, [open])
  const valid = !!reason && (reason !== "outro" || note.trim().length > 2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-xl">
            <Trash className="size-5 text-red-600" /> Remover exame
          </DialogTitle>
          <DialogDescription>
            <strong className="text-ink">{current?.name}</strong> será removido desta solicitação.
          </DialogDescription>
        </DialogHeader>
        {lastOne && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
            Este é o único exame ativo. Sem exames, não será possível agendar — considere recusar a solicitação.
          </p>
        )}
        <ReasonFields reason={reason} setReason={setReason} note={note} setNote={setNote} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={!valid} onClick={() => valid && onConfirm(reason!, note.trim() || undefined)}>
            Remover exame
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
