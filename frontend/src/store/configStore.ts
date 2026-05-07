import { create } from 'zustand'
import type { ProjectConfig, ColorConfig } from '@ds-gen/types'
import { ProjectConfigSchema } from '@ds-gen/types'

const FLOW_CONFIG_KEY = 'ds-gen-flow-config'

export const DEFAULT_CONFIG: ProjectConfig = {
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

function loadStoredConfig(): ProjectConfig {
  try {
    const raw = localStorage.getItem(FLOW_CONFIG_KEY)
    if (raw) {
      const parsed = ProjectConfigSchema.safeParse(JSON.parse(raw))
      if (parsed.success) return parsed.data
    }
  } catch {
    // ignore — corrupted storage
  }
  return DEFAULT_CONFIG
}

interface ConfigStore {
  config: ProjectConfig
  setConfig: (partial: Partial<ProjectConfig>) => void
  setColor: (partial: Partial<ColorConfig>) => void
  resetConfig: () => void
}

export const useConfigStore = create<ConfigStore>()((set) => ({
  config: loadStoredConfig(),
  setConfig: (partial) =>
    set((state) => {
      const updated = { ...state.config, ...partial }
      try {
        localStorage.setItem(FLOW_CONFIG_KEY, JSON.stringify(updated))
      } catch {
        // ignore — private browsing or storage full
      }
      return { config: updated }
    }),
  setColor: (partial) =>
    set((state) => {
      const updated = {
        ...state.config,
        color: { ...state.config.color, ...partial },
      }
      try {
        localStorage.setItem(FLOW_CONFIG_KEY, JSON.stringify(updated))
      } catch {
        // ignore
      }
      return { config: updated }
    }),
  resetConfig: () => {
    try {
      localStorage.removeItem(FLOW_CONFIG_KEY)
    } catch {
      // ignore
    }
    set({ config: DEFAULT_CONFIG })
  },
}))
