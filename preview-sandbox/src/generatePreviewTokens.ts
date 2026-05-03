import { generateColorScale } from '@pipeline/palette/generator'
import {
  NEUTRAL_SEEDS,
  DENSITY_BASE_PX,
  PERSONALITY_RADII,
  DIMENSIONALITY_SHADOWS,
} from '@pipeline/palette/personalities'
import type { ProjectConfig, ColorDirection } from '@ds-gen/types'

const COLOR_DIRECTION_HEX: Record<ColorDirection, string> = {
  'cool-professional': '#3b82f6',
  'warm-approachable': '#f97316',
  'bold-high-contrast': '#6366f1',
  'neutral-minimal': '#64748b',
  'earth-tones': '#78716c',
}

const TYPE_STYLE_FONTS: Record<
  string,
  { display: string; body: string; code: string }
> = {
  geometric: {
    display: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
    code: 'JetBrains Mono, monospace',
  },
  humanist: {
    display: 'Plus Jakarta Sans, sans-serif',
    body: 'Source Sans 3, sans-serif',
    code: 'Fira Code, monospace',
  },
  'serif-accented': {
    display: 'Playfair Display, serif',
    body: 'Source Serif 4, serif',
    code: 'JetBrains Mono, monospace',
  },
  'monospace-accented': {
    display: 'JetBrains Mono, monospace',
    body: 'Inter, sans-serif',
    code: 'JetBrains Mono, monospace',
  },
}

export function generatePreviewTokens(config: ProjectConfig): string {
  const primaryHex =
    config.color.source === 'provided'
      ? config.color.primaryHex
      : COLOR_DIRECTION_HEX[config.color.colorDirection ?? 'cool-professional']

  const primaryScale = generateColorScale(primaryHex)
  const neutralSeed =
    NEUTRAL_SEEDS[config.color.neutralFamily] ?? NEUTRAL_SEEDS['slate']
  const neutralScale = generateColorScale(neutralSeed)

  const styleFonts =
    TYPE_STYLE_FONTS[config.typography.typeStyle] ?? TYPE_STYLE_FONTS.geometric
  const displayFace = config.typography.displayFace || styleFonts.display
  const bodyFace = config.typography.bodyFace || styleFonts.body
  const codeFace = config.typography.codeFace || styleFonts.code

  const spacingBase = DENSITY_BASE_PX[config.shape.density] ?? 4
  const radii = PERSONALITY_RADII[config.shape.personality]
  const shadows = DIMENSIONALITY_SHADOWS[config.shape.dimensionality]

  const tokens: Record<string, string> = {}

  for (const [shade, hex] of Object.entries(primaryScale)) {
    tokens[`--color-primary-${shade}`] = hex
  }
  for (const [shade, hex] of Object.entries(neutralScale)) {
    tokens[`--color-neutral-${shade}`] = hex
  }

  tokens['--font-display'] = displayFace
  tokens['--font-body'] = bodyFace
  tokens['--font-code'] = codeFace
  tokens['--font-scale-ratio'] = String(config.typography.scaleRatio)

  tokens['--spacing-base'] = `${spacingBase}px`

  for (const [key, value] of Object.entries(radii)) {
    tokens[`--${key}`] = value
  }
  for (const [key, value] of Object.entries(shadows)) {
    tokens[`--${key}`] = value
  }

  const declarations = Object.entries(tokens)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n')
  return `:root {\n${declarations}\n}`
}
