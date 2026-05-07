export interface PalettePreset {
  id: string
  name: string
  primaryHex: string
  secondaryHex?: string
  accentHex?: string
  description: string
}

export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: 'cobalt-ember',
    name: 'Cobalt & Ember',
    primaryHex: '#1E40AF',
    accentHex: '#C2410C',
    description: 'Cool blue primary with warm terracotta accent',
  },
  {
    id: 'forest-gold',
    name: 'Forest & Gold',
    primaryHex: '#166534',
    secondaryHex: '#92400E',
    description: 'Deep forest green with warm golden secondary',
  },
  {
    id: 'violet-slate',
    name: 'Violet & Slate',
    primaryHex: '#6D28D9',
    secondaryHex: '#334155',
    description: 'Rich violet with cool slate secondary',
  },
  {
    id: 'rose-navy',
    name: 'Rose & Navy',
    primaryHex: '#BE123C',
    secondaryHex: '#1E3A5F',
    description: 'Bold rose primary with deep navy secondary',
  },
  {
    id: 'teal-coral',
    name: 'Teal & Coral',
    primaryHex: '#0F766E',
    accentHex: '#E44D26',
    description: 'Deep teal primary with vibrant coral accent',
  },
  {
    id: 'amber-indigo',
    name: 'Amber & Indigo',
    primaryHex: '#B45309',
    secondaryHex: '#3730A3',
    description: 'Warm amber primary with deep indigo secondary',
  },
  {
    id: 'slate-mono',
    name: 'Slate Monochrome',
    primaryHex: '#1E293B',
    description: 'Single-color slate system for minimal, high-contrast interfaces',
  },
]
