import { create } from 'zustand'

interface UIStore {
  currentStage: 0 | 1 | 2 | 3
  setStage: (stage: number) => void
  isSaving: boolean
  lastSavedAt: Date | null
}

export const useUIStore = create<UIStore>()((set) => ({
  currentStage: 0,
  setStage: (stage) => set({ currentStage: stage as 0 | 1 | 2 | 3 }),
  isSaving: false,
  lastSavedAt: null,
}))
