import { create } from 'zustand'

interface UIStore {
  currentStage: 0 | 1 | 2 | 3
  setStage: (stage: number) => void
  advance: () => void
  goBack: () => void
  projectName: string
  setProjectName: (name: string) => void
  canAdvance: boolean
  setCanAdvance: (v: boolean) => void
  savedProjectId: string | null
  setSavedProjectId: (id: string | null) => void
  isSaving: boolean
  setIsSaving: (v: boolean) => void
  lastSavedAt: Date | null
  setLastSavedAt: (d: Date | null) => void
}

export const useUIStore = create<UIStore>()((set) => ({
  currentStage: 0,
  setStage: (stage) => set({ currentStage: stage as 0 | 1 | 2 | 3 }),
  advance: () =>
    set((state) => ({
      currentStage: (Math.min(state.currentStage + 1, 3)) as 0 | 1 | 2 | 3,
    })),
  goBack: () =>
    set((state) => ({
      currentStage: (Math.max(state.currentStage - 1, 0)) as 0 | 1 | 2 | 3,
    })),
  projectName: 'My Design System',
  setProjectName: (name) => set({ projectName: name }),
  canAdvance: true,
  setCanAdvance: (v) => set({ canAdvance: v }),
  savedProjectId: null,
  setSavedProjectId: (id) => set({ savedProjectId: id }),
  isSaving: false,
  setIsSaving: (v) => set({ isSaving: v }),
  lastSavedAt: null,
  setLastSavedAt: (d) => set({ lastSavedAt: d }),
}))
