import type { Density, Personality, Dimensionality } from '@ds-gen/types'

export const DENSITY_BASE_PX: Record<Density, number> = {
  compact: 3,
  balanced: 4,
  spacious: 5,
}

export const PERSONALITY_RADII: Record<Personality, Record<string, string>> = {
  professional: {
    'radius-sm': '2px',
    'radius-md': '4px',
    'radius-lg': '6px',
    'radius-full': '9999px',
  },
  approachable: {
    'radius-sm': '6px',
    'radius-md': '12px',
    'radius-lg': '20px',
    'radius-full': '9999px',
  },
  bold: {
    'radius-sm': '0px',
    'radius-md': '4px',
    'radius-lg': '8px',
    'radius-full': '9999px',
  },
  minimal: {
    'radius-sm': '0px',
    'radius-md': '2px',
    'radius-lg': '4px',
    'radius-full': '9999px',
  },
}

export const DIMENSIONALITY_SHADOWS: Record<
  Dimensionality,
  Record<string, string>
> = {
  flat: {
    'shadow-sm': 'none',
    'shadow-md': 'none',
    'shadow-lg': 'none',
  },
  subtle: {
    'shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    'shadow-md':
      '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
    'shadow-lg':
      '0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
  },
  dimensional: {
    'shadow-sm':
      '0 1px 3px 0 rgb(0 0 0 / 0.10), 0 1px 2px -1px rgb(0 0 0 / 0.10)',
    'shadow-md':
      '0 4px 6px -1px rgb(0 0 0 / 0.15), 0 2px 4px -2px rgb(0 0 0 / 0.10)',
    'shadow-lg':
      '0 20px 25px -5px rgb(0 0 0 / 0.15), 0 8px 10px -6px rgb(0 0 0 / 0.10)',
  },
}

// Tailwind 500-level seeds for neutral families
export const NEUTRAL_SEEDS: Record<string, string> = {
  gray: '#6b7280',
  slate: '#64748b',
  zinc: '#71717a',
  stone: '#78716c',
  'warm-gray': '#8a7060',
}
