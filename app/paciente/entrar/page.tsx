"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, CircleAlert, CircleCheck, LoaderCircle, MessageSquareText, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { InstitutionalFooter, PositivoLogo } from "@/components/shared/brand"
import { PatientHeader } from "@/components/paciente/patient-shell"
import { RegisterForm, type RegisterValues } from "@/components/paciente/register-form"
import { brToISODate, firstName, formatCPF, isValidCPF, maskPhone, onlyDigits } from "@/lib/format"
import { useCountdown } from "@/lib/hooks"
import { useData, useHydrated, useSession } from "@/lib/store"
import { cn } from "@/lib/utils"

type Stage = "cpf" | "codigo" | "cadastro"

function randomCPF(existing: string[]) {
  for (;;) {
    const d = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10))
    for (const len of [9, 10]) {
      let s = 0
      for (let i = 0; i < len; i++) s += d[i] * (len + 1 - i)
      const r = (s * 10) % 11
      d.push(r === 10 ? 0 : r)
    }
    const cpf = d.join("")
    if (isValidCPF(cpf) && !existing.includes(cpf)) return cpf
  }
}

export default function EntrarPage() {
  const router = useRouter()
  const hydrated = useHydrated()
  const patients = useData((s) => s.patients)
  const registerPatient = useData((s) => s.registerPatient)
  const setPatient = useSession((s) => s.setPatient)

  const [stage, setStage] = useState<Stage>("cpf")
  const [cpf, setCpf] = useState("")
  const [touched, setTouched] = useState(false)
  const [checking, setChecking] = useState(false)
  const [code, setCode] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [resendKey, setResendKey] = useState(0)
  const left = useCountdown(30, `${stage}-${resendKey}`)

  const digits = onlyDigits(cpf)
  const valid = isValidCPF(digits)
  const showError = (touched || digits.length === 11) && digits.length > 0 && !valid
  const existing = useMemo(() => patients.find((p) => p.cpf === digits), [patients, digits])
  const demoPatient = patients.find((p) => p.id === "p1")

  useEffect(() => {
    if (stage === "codigo") setCode("")
  }, [stage])

  const continueCpf = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setTouched(true)
    if (!valid) return
    setChecking(true)
    await new Promise((r) => setTimeout(r, 450))
    setChecking(false)
    setStage(existing ? "codigo" : "cadastro")
  }

  const verify = async (value: string) => {
    if (value.length < 6 || !existing) return
    setVerifying(true)
    await new Promise((r) => setTimeout(r, 650))
    setPatient(existing.id)
    toast.success(`Bem-vindo(a) de volta, ${firstName(existing.name)}!`)
    router.push("/paciente/agendamentos")
  }

  const onRegister = async (v: RegisterValues) => {
    await new Promise((r) => setTimeout(r, 500))
    const p = registerPatient({
      cpf: digits,
      name: v.name.trim().replace(/\s+/g, " "),
      birthDate: brToISODate(v.birthDate)!,
      sex: v.sex,
      phone: onlyDigits(v.phone),
      email: v.email || undefined,
      motherName: v.motherName || undefined,
      link: v.isStudent ? "aluno" : "comunidade",
    })
    setPatient(p.id)
    toast.success(`Cadastro criado. Olá, ${firstName(p.name)}!`)
    router.push("/paciente/solicitar")
  }

  return (
    <>
      <PatientHeader />
      <main className="flex flex-1 flex-col px-5 pt-8 pb-4">
        {stage !== "cpf" && (
          <button
            onClick={() => setStage("cpf")}
            className="mb-4 -ml-2 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-lg px-2 text-[15px] font-medium text-subtle hover:text-navy"
          >
            <ArrowLeft className="size-4" /> Trocar CPF
          </button>
        )}

        {stage === "cpf" && (
          <form onSubmit={continueCpf} className="animate-enter" noValidate>
            <h1 className="font-heading text-[28px] leading-tight font-bold text-ink">Olá! Vamos agendar seus exames.</h1>
            <p className="mt-2 text-base text-subtle">Para começar, informe seu CPF. Se você já tem cadastro, enviaremos um código.</p>

            <div className="mt-8">
              <Label htmlFor="cpf" className="mb-1.5 block text-[15px] font-medium text-ink">
                CPF
              </Label>
              <div className="relative">
                <Input
                  id="cpf"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="000.000.000-00"
                  value={cpf}
                  autoFocus
                  aria-invalid={showError}
                  aria-describedby="cpf-help"
                  onBlur={() => setTouched(true)}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  className="h-14 pr-12 font-mono text-xl tracking-wider"
                />
                {valid && <CircleCheck className="absolute top-1/2 right-4 size-5 -translate-y-1/2 text-eco animate-enter" aria-hidden />}
              </div>
              <p id="cpf-help" className={cn("mt-2 flex items-center gap-1.5 text-sm", showError ? "font-medium text-red-700" : "text-subtle")} role={showError ? "alert" : undefined}>
                {showError ? (
                  <>
                    <CircleAlert className="size-4" /> CPF inválido. Confira os números digitados.
                  </>
                ) : (
                  "Somente números. A máscara é aplicada automaticamente."
                )}
              </p>
            </div>

            <Button type="submit" size="xl" className="mt-6 w-full" disabled={!valid || checking || !hydrated}>
              {checking && <LoaderCircle className="animate-spin" />}
              Continuar
            </Button>

            <div className="mt-8 rounded-2xl border border-dashed border-eco/40 bg-eco-soft/50 p-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-eco-strong">
                <Sparkles className="size-4" /> Atalhos da demonstração
              </p>
              <div className="mt-3 grid gap-2">
                {demoPatient && (
                  <button
                    type="button"
                    onClick={() => setCpf(formatCPF(demoPatient.cpf))}
                    className="flex min-h-11 items-center justify-between rounded-xl bg-white px-3 text-left text-sm ring-1 ring-line hover:ring-eco/40"
                  >
                    <span>
                      Paciente cadastrada <span className="text-subtle">· {firstName(demoPatient.name)}</span>
                    </span>
                    <span className="font-mono text-xs text-subtle">{formatCPF(demoPatient.cpf)}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCpf(formatCPF(randomCPF(patients.map((p) => p.cpf))))}
                  className="flex min-h-11 items-center justify-between rounded-xl bg-white px-3 text-left text-sm ring-1 ring-line hover:ring-eco/40"
                >
                  <span>Gerar CPF novo (cadastro)</span>
                  <span className="text-xs text-subtle">válido e aleatório</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {stage === "codigo" && existing && (
          <div className="animate-enter">
            <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-eco-soft text-eco-strong">
              <MessageSquareText className="size-7" />
            </span>
            <h1 className="mt-5 font-heading text-[28px] leading-tight font-bold text-ink">Digite o código</h1>
            <p className="mt-2 text-base text-subtle">
              Enviamos um código para <span className="font-semibold whitespace-nowrap text-ink">{maskPhone(existing.phone)}</span>
            </p>

            <div className="mt-8 flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
                onComplete={verify}
                inputMode="numeric"
                autoFocus
                disabled={verifying}
                aria-label="Código de verificação de 6 dígitos"
                containerClassName="gap-2"
              >
                <InputOTPGroup className="gap-2">
                  {Array.from({ length: 6 }, (_, i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="size-12 rounded-xl border border-input bg-white font-heading text-2xl font-bold first:rounded-xl last:rounded-xl data-[active=true]:border-eco data-[active=true]:ring-eco/25"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            <p className="mt-4 text-center text-sm text-subtle">
              Demo: use <span className="font-mono font-semibold text-ink">123456</span> (qualquer código é aceito)
            </p>

            <Button size="xl" className="mt-6 w-full" disabled={code.length < 6 || verifying} onClick={() => verify(code)}>
              {verifying && <LoaderCircle className="animate-spin" />}
              {verifying ? "Verificando…" : "Entrar"}
            </Button>

            <div className="mt-4 text-center">
              <button
                disabled={left > 0}
                onClick={() => {
                  setResendKey((k) => k + 1)
                  toast.success("Novo código enviado por SMS")
                }}
                className="min-h-11 rounded-lg px-3 text-[15px] font-medium text-brand disabled:text-subtle"
              >
                {left > 0 ? `Reenviar código em ${left}s` : "Reenviar código"}
              </button>
            </div>
          </div>
        )}

        {stage === "cadastro" && (
          <div className="animate-enter">
            <h1 className="font-heading text-[28px] leading-tight font-bold text-ink">Crie seu cadastro</h1>
            <p className="mt-2 mb-6 text-base text-subtle">Precisamos de poucas informações para identificar você na clínica.</p>
            <RegisterForm cpf={digits} onSubmit={onRegister} />
          </div>
        )}

        <div className="mt-auto pt-8">
          {stage === "cpf" ? (
            <InstitutionalFooter compact />
          ) : (
            <div className="flex justify-center py-4">
              <PositivoLogo className="h-5 opacity-80" />
            </div>
          )}
        </div>
      </main>
    </>
  )
}
