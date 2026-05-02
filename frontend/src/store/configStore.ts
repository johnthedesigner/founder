import { create } from 'zustand'
import type { ProjectConfig } from '@ds-gen/types'

const DEFAULT_CONFIG: ProjectConfig = {
  projectType: 'saas',
  componentScope: ['forms', 'navigation', 'overlays', 'feedback', 'data-display', 'layout'],
  modes: ['light'],
  color: {
    source: 'generated',
    primaryHex: '#3b82f6',
    colorDirection: 'cool-professional',
    neutralFamily: 'slate',
  },
  typography: {
    source: 'chosen',
    typeStyle: 'geometric',
    displayFace: 'Inter',
    bodyFace: 'Inter',
    codeFace: 'JetBrains Mono',
    scaleRatio: 1.25,
  },
  shape: {
    density: 'balanced',
    personality: 'professional',
    dimensionality: 'subtle',
  },
}

interface ConfigStore {
  config: ProjectConfig
  setConfig: (partial: Partial<ProjectConfig>) => void
  resetConfig: () => void
}

export const useConfigStore = create<ConfigStore>()((set) => ({
  config: DEFAULT_CONFIG,
  setConfig: (partial) =>
    set((state) => ({ config: { ...state.config, ...partial } })),
  resetConfig: () => set({ config: DEFAULT_CONFIG }),
}))
