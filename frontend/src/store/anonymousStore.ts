import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AnonymousEntry {
  id: string
  ownerToken: string
  name: string
  createdAt: string
}

interface AnonymousStore {
  entries: AnonymousEntry[]
  addEntry: (entry: AnonymousEntry) => void
  removeEntry: (id: string) => void
  clearAll: () => void
  getToken: (id: string) => string | undefined
}

export const useAnonymousStore = create<AnonymousStore>()(
  persist(
    (set, get) => ({
      entries: [],
      addEntry: (entry) =>
        set((s) => ({
          entries: s.entries.some((e) => e.id === entry.id)
            ? s.entries
            : [...s.entries, entry],
        })),
      removeEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
      clearAll: () => set({ entries: [] }),
      getToken: (id) => get().entries.find((e) => e.id === id)?.ownerToken,
    }),
    { name: 'ds-gen-anonymous' },
  ),
)
