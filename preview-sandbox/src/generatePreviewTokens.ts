import { generateColorScale } from '@pipeline/palette/generator'
import { deriveFunctionalColors } from '@pipeline/palette/functional'
import {
  NEUTRAL_SEEDS,
  DENSITY_BASE_PX,
  PERSONALITY_RADII,
  DIMENSIONALITY_SHADOWS,
} from '@pipeline/palette/personalities'
import type { ProjectConfig } from '@ds-gen/types'

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
  const primaryScale = generateColorScale(config.color.primaryHex)
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

  if (config.color.secondaryHex) {
    const secondaryScale = generateColorScale(config.color.secondaryHex)
    for (const [shade, hex] of Object.entries(secondaryScale)) {
      tokens[`--color-secondary-${shade}`] = hex
    }
  }

  if (config.color.accentHex) {
    const accentScale = generateColorScale(config.color.accentHex)
    for (const [shade, hex] of Object.entries(accentScale)) {
      tokens[`--color-accent-${shade}`] = hex
    }
  }

  const functionalScales = deriveFunctionalColors(config.color, config.projectType)
  for (const [role, scale] of Object.entries(functionalScales)) {
    for (const [shade, hex] of Object.entries(scale)) {
      tokens[`--color-${role}-${shade}`] = hex
    }
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
