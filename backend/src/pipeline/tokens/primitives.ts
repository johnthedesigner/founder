import type { ProjectConfig, PrimitiveTokenSet } from '@ds-gen/types'
import { generateColorScale } from '../palette/generator'
import { deriveFunctionalColors } from '../palette/functional'
import {
  DENSITY_BASE_PX,
  PERSONALITY_RADII,
  DIMENSIONALITY_SHADOWS,
  NEUTRAL_SEEDS,
} from '../palette/personalities'

const SPACING_STEPS = [
  1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40, 48,
]

const TYPE_SIZE_NAMES = [
  'text-xs',
  'text-sm',
  'text-base',
  'text-lg',
  'text-xl',
  'text-2xl',
  'text-3xl',
]

function formatRem(value: number): string {
  return `${parseFloat(value.toFixed(3))}rem`
}

export function generatePrimitives(config: ProjectConfig): PrimitiveTokenSet {
  const colors: PrimitiveTokenSet['colors'] = {
    primary: generateColorScale(config.color.primaryHex),
    neutral: generateColorScale(
      NEUTRAL_SEEDS[config.color.neutralFamily] ?? '#6b7280',
    ),
  }
  if (config.color.secondaryHex) {
    colors.secondary = generateColorScale(config.color.secondaryHex)
  }
  if (config.color.accentHex) {
    colors.accent = generateColorScale(config.color.accentHex)
  }

  const functionalScales = deriveFunctionalColors(config.color, config.projectType)
  Object.assign(colors, functionalScales)

  const basePx = DENSITY_BASE_PX[config.shape.density]
  const spacing: Record<string, string> = {}
  for (const n of SPACING_STEPS) {
    spacing[`space-${n}`] = `${basePx * n}px`
  }

  // text-base is at index 2, so exponent = index - 2
  const { scaleRatio } = config.typography
  const typeSizes: Record<string, string> = {}
  TYPE_SIZE_NAMES.forEach((name, i) => {
    typeSizes[name] = formatRem(scaleRatio ** (i - 2))
  })

  const radii = { ...PERSONALITY_RADII[config.shape.personality] }
  const shadows = { ...DIMENSIONALITY_SHADOWS[config.shape.dimensionality] }

  return { colors, spacing, typeSizes, radii, shadows }
}
