import type {
  ProjectConfig,
  PrimitiveTokenSet,
  SemanticTokenSet,
  SemanticColorValue,
  TokenCorrection,
  ColorScale,
} from '@ds-gen/types'
import { generateColorScale } from '../palette/generator'
import { contrastRatio, findAccessibleStep } from './accessibility'

// Fallback scales used when primitives.colors lacks palette-derived functional scales,
// and for the destructive action token which always uses red regardless of palette.
const FALLBACK_RED = generateColorScale('#ef4444')
const FALLBACK_GREEN = generateColorScale('#22c55e')
const FALLBACK_AMBER = generateColorScale('#f59e0b')
const FALLBACK_BLUE = generateColorScale('#3b82f6')

const WHITE = '#ffffff'

function s(scale: ColorScale, n: number): string {
  return (scale[n] as string | undefined) ?? WHITE
}

function resolveColorTokens(
  primitives: PrimitiveTokenSet,
  isDark: boolean,
): Record<string, string> {
  const { primary, neutral } = primitives.colors
  const errorScale = primitives.colors.error ?? FALLBACK_RED
  const successScale = primitives.colors.success ?? FALLBACK_GREEN
  const warningScale = primitives.colors.warning ?? FALLBACK_AMBER
  const infoScale = primitives.colors.info ?? FALLBACK_BLUE
  return {
    'color.action.primary': isDark ? s(primary, 400) : s(primary, 600),
    'color.action.primary.hover': isDark ? s(primary, 300) : s(primary, 700),
    'color.action.primary.fg': s(neutral, 50),
    'color.action.secondary': isDark ? s(neutral, 800) : s(neutral, 100),
    'color.action.secondary.fg': isDark ? s(neutral, 50) : s(neutral, 900),
    'color.action.destructive': isDark ? s(FALLBACK_RED, 400) : s(FALLBACK_RED, 600),
    'color.action.destructive.fg': s(neutral, 50),
    'color.surface.default': isDark ? s(neutral, 950) : s(neutral, 50),
    'color.surface.raised': isDark ? s(neutral, 900) : WHITE,
    'color.surface.overlay': isDark ? s(neutral, 850) : WHITE,
    'color.surface.subtle': isDark ? s(neutral, 800) : s(neutral, 100),
    'color.text.primary': isDark ? s(neutral, 50) : s(neutral, 950),
    'color.text.secondary': isDark ? s(neutral, 400) : s(neutral, 600),
    'color.text.disabled': isDark ? s(neutral, 600) : s(neutral, 400),
    'color.text.on-action': s(neutral, 50),
    'color.border.default': isDark ? s(neutral, 700) : s(neutral, 200),
    'color.border.strong': isDark ? s(neutral, 500) : s(neutral, 400),
    'color.border.action': isDark ? s(primary, 400) : s(primary, 600),
    'color.feedback.success': isDark ? s(successScale, 400) : s(successScale, 600),
    'color.feedback.warning': isDark ? s(warningScale, 400) : s(warningScale, 600),
    'color.feedback.error': isDark ? s(errorScale, 400) : s(errorScale, 600),
    'color.feedback.info': isDark ? s(infoScale, 400) : s(infoScale, 600),
  }
}

type PairSpec = {
  fg: string
  bg: string
  ratio: number
  fgScale: (p: PrimitiveTokenSet) => ColorScale
}

// All text foreground/background pairs that must meet 4.5:1
const WCAG_PAIRS: PairSpec[] = [
  {
    fg: 'color.action.primary.fg',
    bg: 'color.action.primary',
    ratio: 4.5,
    fgScale: (p) => p.colors.neutral,
  },
  {
    fg: 'color.action.secondary.fg',
    bg: 'color.action.secondary',
    ratio: 4.5,
    fgScale: (p) => p.colors.neutral,
  },
  {
    fg: 'color.action.destructive.fg',
    bg: 'color.action.destructive',
    ratio: 4.5,
    fgScale: (p) => p.colors.neutral,
  },
  {
    fg: 'color.text.primary',
    bg: 'color.surface.default',
    ratio: 4.5,
    fgScale: (p) => p.colors.neutral,
  },
  {
    fg: 'color.text.secondary',
    bg: 'color.surface.default',
    ratio: 4.5,
    fgScale: (p) => p.colors.neutral,
  },
  {
    fg: 'color.text.on-action',
    bg: 'color.action.primary',
    ratio: 4.5,
    fgScale: (p) => p.colors.neutral,
  },
]

function correctColorTokens(
  resolved: Record<string, string>,
  primitives: PrimitiveTokenSet,
  mode: 'light' | 'dark',
): { tokens: Record<string, string>; corrections: TokenCorrection[] } {
  const tokens = { ...resolved }
  const corrections: TokenCorrection[] = []

  for (const pair of WCAG_PAIRS) {
    const fgHex = tokens[pair.fg]
    const bgHex = tokens[pair.bg]
    if (!fgHex || !bgHex) continue
    if (contrastRatio(fgHex, bgHex) >= pair.ratio) continue

    const scale = pair.fgScale(primitives)
    let corrected: string
    try {
      corrected = findAccessibleStep(scale, bgHex, pair.ratio)
    } catch {
      // No step qualifies — use whichever has maximum contrast
      corrected = Object.values(scale).reduce((best, hex) =>
        contrastRatio(hex, bgHex) > contrastRatio(best, bgHex) ? hex : best,
      )
    }

    corrections.push({
      token: `${pair.fg} (${mode})`,
      originalValue: fgHex,
      correctedValue: corrected,
      reason: `Contrast ${contrastRatio(fgHex, bgHex).toFixed(2)}:1 against ${pair.bg} is below ${pair.ratio}:1 WCAG AA`,
    })
    tokens[pair.fg] = corrected
  }

  return { tokens, corrections }
}

function buildTypographyTokens(
  config: ProjectConfig,
  typeSizes: Record<string, string>,
): Record<string, string> {
  const { displayFace, bodyFace, codeFace, scaleRatio } = config.typography
  const rem3xl = parseFloat(typeSizes['text-3xl'] ?? '1rem')
  const fmt = (v: number) => `${parseFloat(v.toFixed(3))}rem`

  return {
    'font.family.display': displayFace,
    'font.family.body': bodyFace,
    'font.family.ui': bodyFace,
    'font.family.code': codeFace,
    'font.size.xs': typeSizes['text-xs'] ?? '0.64rem',
    'font.size.sm': typeSizes['text-sm'] ?? '0.8rem',
    'font.size.base': typeSizes['text-base'] ?? '1rem',
    'font.size.lg': typeSizes['text-lg'] ?? '1.25rem',
    'font.size.xl': typeSizes['text-xl'] ?? '1.563rem',
    'font.size.2xl': typeSizes['text-2xl'] ?? '1.953rem',
    'font.size.3xl': typeSizes['text-3xl'] ?? '2.441rem',
    'font.size.4xl': fmt(rem3xl * scaleRatio),
    'font.size.5xl': fmt(rem3xl * scaleRatio * scaleRatio),
    'font.weight.normal': '400',
    'font.weight.medium': '500',
    'font.weight.semibold': '600',
    'font.weight.bold': '700',
    'font.line-height.tight': '1.25',
    'font.line-height.normal': '1.5',
    'font.line-height.relaxed': '1.75',
  }
}

function buildSpacingTokens(
  spacing: Record<string, string>,
): Record<string, string> {
  return {
    'space.component.xs': spacing['space-2'] ?? '8px',
    'space.component.sm': spacing['space-3'] ?? '12px',
    'space.component.md': spacing['space-4'] ?? '16px',
    'space.component.lg': spacing['space-6'] ?? '24px',
    'space.component.xl': spacing['space-8'] ?? '32px',
    'space.layout.xs': spacing['space-8'] ?? '32px',
    'space.layout.sm': spacing['space-12'] ?? '48px',
    'space.layout.md': spacing['space-16'] ?? '64px',
    'space.layout.lg': spacing['space-24'] ?? '96px',
    'space.layout.xl': spacing['space-32'] ?? '128px',
  }
}

function buildRadiusTokens(
  radii: Record<string, string>,
): Record<string, string> {
  return {
    'radius.sm': radii['radius-sm'] ?? '2px',
    'radius.md': radii['radius-md'] ?? '4px',
    'radius.lg': radii['radius-lg'] ?? '6px',
    'radius.full': radii['radius-full'] ?? '9999px',
  }
}

function buildShadowTokens(
  shadows: Record<string, string>,
): Record<string, string> {
  return {
    'shadow.sm': shadows['shadow-sm'] ?? 'none',
    'shadow.md': shadows['shadow-md'] ?? 'none',
    'shadow.lg': shadows['shadow-lg'] ?? 'none',
  }
}

export function generateSemanticTokens(
  primitives: PrimitiveTokenSet,
  config: ProjectConfig,
): SemanticTokenSet {
  const hasDark = config.modes.includes('dark')

  const lightResolved = resolveColorTokens(primitives, false)
  const { tokens: lightTokens, corrections: lightFixes } = correctColorTokens(
    lightResolved,
    primitives,
    'light',
  )

  let darkTokens: Record<string, string> | null = null
  let darkFixes: TokenCorrection[] = []
  if (hasDark) {
    const darkResolved = resolveColorTokens(primitives, true)
    const result = correctColorTokens(darkResolved, primitives, 'dark')
    darkTokens = result.tokens
    darkFixes = result.corrections
  }

  const colors: Record<string, SemanticColorValue> = {}
  for (const key of Object.keys(lightTokens)) {
    const entry: SemanticColorValue = { light: lightTokens[key] }
    if (hasDark && darkTokens) entry.dark = darkTokens[key]
    colors[key] = entry
  }

  return {
    colors,
    typography: buildTypographyTokens(config, primitives.typeSizes),
    spacing: buildSpacingTokens(primitives.spacing),
    radii: buildRadiusTokens(primitives.radii),
    shadows: buildShadowTokens(primitives.shadows),
    corrections: [...lightFixes, ...darkFixes],
  }
}
