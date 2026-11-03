"use client"

import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { differenceInYears, parse } from "date-fns"
import { CircleAlert, GraduationCap, LoaderCircle, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { brToISODate, formatCPF, formatDateInput, formatPhone, onlyDigits } from "@/lib/format"
import { cn } from "@/lib/utils"

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe seu nome completo.")
    .refine((v) => v.split(/\s+/).filter(Boolean).length >= 2, "Informe nome e sobrenome."),
  birthDate: z
    .string()
    .min(1, "Informe sua data de nascimento.")
    .refine((v) => !!brToISODate(v), "Use o formato dd/mm/aaaa.")
    .refine((v) => {
      const d = parse(v, "dd/MM/yyyy", new Date())
      const age = differenceInYears(new Date(), d)
      return d <= new Date() && age <= 120
    }, "Data de nascimento inválida."),
  sex: z.enum(["F", "M"], { message: "Selecione uma opção." }),
  phone: z
    .string()
    .min(1, "Informe seu telefone ou WhatsApp.")
    .refine((v) => onlyDigits(v).length === 11, "Use DDD + 9 dígitos. Ex.: (41) 99999-9999"),
  email: z.union([z.literal(""), z.string().trim().email("E-mail inválido.")]),
  motherName: z.string().trim().optional(),
  isStudent: z.boolean(),
  consent: z.boolean().refine((v) => v, "É preciso aceitar o termo para continuar."),
})

export type RegisterValues = z.infer<typeof schema>

export function RegisterForm({ cpf, onSubmit }: { cpf: string; onSubmit: (v: RegisterValues) => Promise<void> | void }) {
  const [termOpen, setTermOpen] = useState(false)
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { name: "", birthDate: "", phone: "", email: "", motherName: "", isStudent: false, consent: false },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="rounded-xl bg-brand-soft/70 px-4 py-3 text-sm text-navy">
        CPF <span className="font-mono font-semibold">{formatCPF(cpf)}</span> ainda não tem cadastro. Leva menos de 1 minuto.
      </div>

      <Field id="name" label="Nome completo" error={errors.name?.message}>
        <Input id="name" autoComplete="name" autoCapitalize="words" className="h-12 text-base" aria-invalid={!!errors.name} {...register("name")} />
      </Field>

      <Field id="birthDate" label="Data de nascimento" hint="dd/mm/aaaa" error={errors.birthDate?.message}>
        <Controller
          control={control}
          name="birthDate"
          render={({ field }) => (
            <Input
              id="birthDate"
              inputMode="numeric"
              autoComplete="bday"
              placeholder="dd/mm/aaaa"
              className="h-12 text-base"
              aria-invalid={!!errors.birthDate}
              value={field.value}
              onBlur={field.onBlur}
              onChange={(e) => field.onChange(formatDateInput(e.target.value))}
            />
          )}
        />
      </Field>

      <fieldset>
        <legend className="mb-1.5 text-[15px] font-medium text-ink">Sexo biológico</legend>
        <Controller
          control={control}
          name="sex"
          render={({ field }) => (
            <div role="radiogroup" className="grid grid-cols-2 gap-2">
              {(
                [
                  ["F", "Feminino"],
                  ["M", "Masculino"],
                ] as const
              ).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={field.value === v}
                  onClick={() => field.onChange(v)}
                  className={cn(
                    "h-12 rounded-xl border text-base font-medium transition-all duration-150",
                    field.value === v ? "border-eco bg-eco-soft text-eco-strong ring-2 ring-eco/25" : "border-input bg-white text-ink hover:border-brand/40",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
        />
        <p className="mt-1.5 text-sm text-subtle">Usado só para indicar exames compatíveis com você.</p>
        {errors.sex && <ErrorText>{errors.sex.message}</ErrorText>}
      </fieldset>

      <Field id="phone" label="Telefone / WhatsApp" error={errors.phone?.message}>
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="(41) 99999-9999"
              className="h-12 text-base"
              aria-invalid={!!errors.phone}
              value={field.value}
              onBlur={field.onBlur}
              onChange={(e) => field.onChange(formatPhone(e.target.value))}
            />
          )}
        />
      </Field>

      <Controller
        control={control}
        name="isStudent"
        render={({ field }) => (
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-line bg-white px-4 py-3">
            <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} className="size-5" />
            <GraduationCap className="size-5 text-brand" aria-hidden />
            <span className="text-[15px] text-ink">Sou aluno(a) da Universidade Positivo</span>
          </label>
        )}
      />

      <div className="space-y-4 rounded-2xl border border-dashed border-line p-4">
        <p className="text-sm font-semibold text-subtle">Opcional</p>
        <Field id="email" label="E-mail" error={errors.email?.message}>
          <Input id="email" type="email" inputMode="email" autoComplete="email" className="h-12 text-base" aria-invalid={!!errors.email} {...register("email")} />
        </Field>
        <Field id="motherName" label="Nome da mãe">
          <Input id="motherName" autoComplete="off" autoCapitalize="words" className="h-12 text-base" {...register("motherName")} />
        </Field>
      </div>

      <div>
        <Controller
          control={control}
          name="consent"
          render={({ field }) => (
            <div className={cn("flex items-start gap-3 rounded-xl border bg-white p-4", errors.consent ? "border-red-300" : "border-line")}>
              <Checkbox
                id="consent"
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
                className="mt-0.5 size-5"
                aria-invalid={!!errors.consent}
              />
              <div className="text-[15px] leading-relaxed">
                <label htmlFor="consent" className="cursor-pointer text-ink">
                  Autorizo o uso dos meus dados pela Clínica LEAC para o agendamento e realização dos exames, conforme a LGPD.
                </label>{" "}
                <button type="button" onClick={() => setTermOpen(true)} className="font-semibold text-brand underline underline-offset-2">
                  ler termo
                </button>
              </div>
            </div>
          )}
        />
        {errors.consent && <ErrorText>{errors.consent.message}</ErrorText>}
      </div>

      <Button type="submit" size="xl" variant="eco" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <LoaderCircle className="animate-spin" /> : null}
        Criar cadastro e continuar
      </Button>

      <Sheet open={termOpen} onOpenChange={setTermOpen}>
        <SheetContent side="bottom" className="mx-auto max-h-[85dvh] max-w-md rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 font-heading text-xl">
              <ShieldCheck className="size-5 text-eco-strong" /> Termo de consentimento
            </SheetTitle>
            <SheetDescription>Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 overflow-y-auto px-4 pb-2 text-[15px] leading-relaxed text-ink/80">
            <p>
              A Clínica LEAC da Universidade Positivo coleta seus dados de identificação e contato apenas para agendar, realizar e
              entregar os resultados dos exames solicitados.
            </p>
            <p>
              Os atendimentos são feitos por estudantes de enfermagem e medicina, sempre sob supervisão de preceptores. Eles terão
              acesso às informações necessárias para o seu cuidado.
            </p>
            <p>
              Seus dados não serão vendidos nem compartilhados com terceiros. Indicadores da clínica usam apenas dados agregados e
              anônimos.
            </p>
            <p>Você pode pedir a correção ou exclusão dos seus dados a qualquer momento na recepção da clínica.</p>
          </div>
          <div className="p-4 pt-0">
            <Button size="xl" className="w-full" onClick={() => setTermOpen(false)}>
              Entendi
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </form>
  )
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <Label htmlFor={id} className="text-[15px] font-medium text-ink">
          {label}
        </Label>
        {hint && <span className="text-xs text-subtle">{hint}</span>}
      </div>
      {children}
      {error && <ErrorText id={`${id}-error`}>{error}</ErrorText>}
    </div>
  )
}

function ErrorText({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-red-700 animate-enter">
      <CircleAlert className="size-4 shrink-0" aria-hidden />
      {children}
    </p>
  )
}
