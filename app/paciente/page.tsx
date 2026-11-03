"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { PatientPageSkeleton } from "@/components/paciente/patient-shell"
import { useHydrated, useSession } from "@/lib/store"

export default function PacienteIndex() {
  const router = useRouter()
  const hydrated = useHydrated()
  const patientId = useSession((s) => s.patientId)
  useEffect(() => {
    if (hydrated) router.replace(patientId ? "/paciente/agendamentos" : "/paciente/entrar")
  }, [hydrated, patientId, router])
  return <PatientPageSkeleton />
}
