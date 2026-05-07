import chroma from 'chroma-js'
import type { ColorScale, ColorConfig, FunctionalColorRole } from '@ds-gen/types'
import type { ProjectType } from '@ds-gen/types'
import { generateColorScale } from './generator'

const ROLE_TARGET_HUES: Record<FunctionalColorRole, number> = {
  error: 0,
  warning: 35,
  success: 130,
  info: 220,
}

const CANONICAL_SEEDS: Record<FunctionalColorRole, string> = {
  error: '#ef4444',
  warning: '#f59e0b',
  success: '#22c55e',
  info: '#3b82f6',
}

const PROJECT_TYPE_ENABLED: Record<ProjectType, FunctionalColorRole[]> = {
  saas: ['error', 'warning', 'success', 'info'],
  marketing: ['error'],
  mobile: ['error', 'warning', 'success', 'info'],
}

function hueDist(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

function getHslHue(hex: string): number {
  const [h] = chroma(hex).hsl()
  return typeof h === 'number' && !Number.isNaN(h) ? h : 0
}

function collectBrandHexes(config: ColorConfig): string[] {
  const hexes: string[] = [config.primaryHex]
  if (config.secondaryHex) hexes.push(config.secondaryHex)
  if (config.accentHex) hexes.push(config.accentHex)
  return hexes
}

// Generates a scale for the role's canonical hue, with chroma blended 20%
// toward the brand palette's average perceptual chroma.
function generateAdaptedScale(role: FunctionalColorRole, brandHexes: string[]): ColorScale {
  const canonicalSeed = CANONICAL_SEEDS[role]
  const brandAvgC = brandHexes.reduce((sum, h) => sum + chroma(h).hcl()[1], 0) / brandHexes.length
  const [canonicalH, canonicalC, canonicalL] = chroma(canonicalSeed).hcl()
  const adaptedC = Math.max(0, canonicalC + (brandAvgC - canonicalC) * 0.2)
  const adaptedSeed = chroma.hcl(canonicalH, adaptedC, canonicalL).hex()
  return generateColorScale(adaptedSeed)
}

export function deriveFunctionalColors(
  config: ColorConfig,
  projectType: ProjectType,
): Record<string, ColorScale> {
  const activeRoles =
    config.functionalColors?.enabled ?? PROJECT_TYPE_ENABLED[projectType] ?? []

  if (activeRoles.length === 0) return {}

  const brandHexes = collectBrandHexes(config)
  const result: Record<string, ColorScale> = {}

  for (const role of activeRoles) {
    // Explicit override takes precedence
    const override = config.functionalColors?.overrides?.[role]
    if (override) {
      result[role] = generateColorScale(override)
      continue
    }

    const primaryHue = getHslHue(config.primaryHex)

    // Alias info → primary when primary is blue-adjacent (avoids duplicate scale)
    if (role === 'info' && hueDist(primaryHue, ROLE_TARGET_HUES.info) <= 30) {
      result[role] = generateColorScale(config.primaryHex)
      continue
    }

    // Alias warning → accent when accent is amber-adjacent
    if (role === 'warning' && config.accentHex) {
      if (hueDist(getHslHue(config.accentHex), ROLE_TARGET_HUES.warning) <= 30) {
        result[role] = generateColorScale(config.accentHex)
        continue
      }
    }

    // Find closest brand color by HSL hue distance
    const targetHue = ROLE_TARGET_HUES[role]
    let closestHex = config.primaryHex
    let closestDist = hueDist(primaryHue, targetHue)

    for (const hex of brandHexes.slice(1)) {
      const dist = hueDist(getHslHue(hex), targetHue)
      if (dist < closestDist) {
        closestDist = dist
        closestHex = hex
      }
    }

    result[role] =
      closestDist <= 30
        ? generateColorScale(closestHex)
        : generateAdaptedScale(role, brandHexes)
  }

  return result
}
