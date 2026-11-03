"use client"

import { create } from "zustand"

/** IDs de solicitações recém-chegadas (para animação de destaque na fila). */
export const useFresh = create<{ ids: string[]; add: (id: string) => void; remove: (id: string) => void }>()((set) => ({
  ids: [],
  add: (id) => {
    set((s) => ({ ids: [...s.ids, id] }))
    setTimeout(() => set((s) => ({ ids: s.ids.filter((x) => x !== id) })), 5000)
  },
  remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
}))
