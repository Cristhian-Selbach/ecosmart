"use client"

import { useEffect } from "react"
import { Toaster } from "sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DATA_KEY, useData, useHydration, useSession } from "@/lib/store"

function StoreSync() {
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await Promise.all([useData.persist.rehydrate(), useSession.persist.rehydrate()])
      if (cancelled) return
      if (!useData.getState().seeded) useData.getState().seed()
      useHydration.getState().setHydrated()
    })()

    // Sincronização em tempo real entre abas (paciente ↔ equipe)
    const onStorage = (e: StorageEvent) => {
      if (e.key === DATA_KEY) void useData.persist.rehydrate()
    }
    window.addEventListener("storage", onStorage)
    return () => {
      cancelled = true
      window.removeEventListener("storage", onStorage)
    }
  }, [])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <StoreSync />
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{ classNames: { toast: "!rounded-2xl !font-sans !shadow-lift", title: "!font-semibold" } }}
      />
    </TooltipProvider>
  )
}
