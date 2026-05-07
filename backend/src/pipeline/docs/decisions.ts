import type { ProjectConfig, TypeStyle, Personality, Density, Dimensionality } from '@ds-gen/types'
import { PALETTE_PRESETS } from '@ds-gen/types'

const TYPE_STYLE_RATIONALE: Record<TypeStyle, string> = {
  geometric:
    'The type scale uses a geometric sans-serif (Inter) with a modular scale ratio of {ratio}. Geometric faces provide clean, neutral letterforms well-suited to data-dense interfaces. The scale ratio produces distinct, harmonious size steps without feeling cramped or exaggerated.',
  humanist:
    'The type scale uses a humanist sans-serif with a modular scale ratio of {ratio}. Humanist faces bring warmth and approachability to the interface. Their open apertures and slight stroke variation improve readability at body sizes.',
  'serif-accented':
    'The type scale uses a serif-accented approach: a serif display face for headings and a sans-serif for body text, with a modular scale ratio of {ratio}. This pairing adds editorial authority to headings while keeping body content legible and modern.',
  'monospace-accented':
    'The type scale uses a monospace display face to signal a technical or developer-oriented product, with a modular scale ratio of {ratio}. Monospace display accents reinforce the product personality at large sizes while the body remains set in a readable sans-serif.',
}

const PERSONALITY_RADIUS_RATIONALE: Record<Personality, string> = {
  professional:
    'Border radii use a restrained professional scale (2px base, up to 4px for cards). Subtle rounding softens the interface without compromising the perception of reliability and precision.',
  approachable:
    'Border radii use a generous approachable scale (6px base, up to 20px for cards). Rounder corners signal friendliness and reduce visual tension, making the product feel more inviting.',
  bold:
    'Border radii use a bold scale with sharp corners (0px base) on most elements. The starkness is intentional: it projects confidence and urgency without any visual hesitancy.',
  minimal:
    'Border radii use a near-zero minimal scale (0px base). The absence of rounding is a design choice that prioritises clarity and grid alignment over surface ornamentation.',
}

const DENSITY_SPACING_RATIONALE: Record<Density, string> = {
  compact:
    'Spacing density is compact (3px base unit). Tighter spacing increases information density, which is appropriate for power-user tools, dashboards, and data-heavy views.',
  balanced:
    'Spacing density is balanced (4px base unit). A 4px grid strikes the most common trade-off between information density and visual breathing room.',
  spacious:
    'Spacing density is spacious (5px base unit). Generous spacing improves scannability and reduces cognitive load, which is well-suited to marketing sites and onboarding flows.',
}

const DIMENSIONALITY_RATIONALE: Record<Dimensionality, string> = {
  flat:
    'Shadow dimensionality is flat: no drop shadows are applied to surfaces. The flat approach produces a clean, high-contrast interface where hierarchy is expressed through color and spacing alone.',
  subtle:
    'Shadow dimensionality is subtle: light drop shadows are used to distinguish raised surfaces (cards, dropdowns, modals) from the page background. Shadows are perceptible but do not distract.',
  dimensional:
    'Shadow dimensionality is dimensional: prominent drop shadows create a clear Z-axis hierarchy. Overlapping surfaces cast visible shadows that help users understand the spatial relationship of UI layers.',
}

const COLOR_DIRECTION_RATIONALE: Record<string, string> = {
  'cool-professional':
    'The color direction is cool-professional. Primary colors skew blue-to-indigo, producing a palette associated with trust, reliability, and expertise. Neutral tones are cool-leaning to reinforce the professional feel.',
  'warm-approachable':
    'The color direction is warm-approachable. Primary colors skew into amber and orange-adjacent hues, producing a palette that reads as friendly, energetic, and human.',
  'bold-high-contrast':
    'The color direction is bold-high-contrast. Primary colors are chosen for maximum impact and saturation. Contrast ratios are maximised at each shade, producing a palette that commands attention.',
  'neutral-minimal':
    'The color direction is neutral-minimal. The primary color palette is deliberately low-saturation, allowing content and data to take the foreground. UI chrome nearly disappears.',
  'earth-tones':
    'The color direction uses earth tones. Primary hues reference natural materials — ochre, terra cotta, sage — producing a palette that feels grounded and distinctive against the typical blue-dominant web.',
}

export function generateDecisions(config: ProjectConfig): string {
  const { typography, shape, color } = config

  const typeRationale = TYPE_STYLE_RATIONALE[typography.typeStyle].replace(
    '{ratio}',
    String(typography.scaleRatio),
  )

  const radiusRationale = PERSONALITY_RADIUS_RATIONALE[shape.personality]
  const spacingRationale = DENSITY_SPACING_RATIONALE[shape.density]
  const dimensionalityRationale = DIMENSIONALITY_RATIONALE[shape.dimensionality]
  let colorRationale: string
  if (color.paletteId) {
    const preset = PALETTE_PRESETS.find((p) => p.id === color.paletteId)
    colorRationale = preset
      ? `The ${preset.name} preset palette was selected as the color foundation. ${preset.description}.`
      : `The primary color ${color.primaryHex} was used as the seed for scale generation.`
  } else {
    colorRationale =
      COLOR_DIRECTION_RATIONALE[color.colorDirection ?? 'cool-professional'] ??
      `The primary color ${color.primaryHex} was used as the seed for scale generation.`
  }

  return `# Design Decisions

This document explains the rationale behind each major design decision in this system. These decisions were derived from the \`ProjectConfig\` and are specific to this generation run.

---

## Type Scale

**Configuration:** typeStyle = \`${typography.typeStyle}\`, scaleRatio = \`${typography.scaleRatio}\`, displayFace = \`${typography.displayFace}\`, bodyFace = \`${typography.bodyFace}\`

${typeRationale}

The display face (\`${typography.displayFace}\`) is used for headings (font.family.display). The body face (\`${typography.bodyFace}\`) is used for UI text and body copy (font.family.body, font.family.ui). The code face (\`${typography.codeFace}\`) is used for monospaced content.

---

## Border Radius

**Configuration:** personality = \`${shape.personality}\`

${radiusRationale}

The full border radius scale (radius.none, radius.sm, radius.md, radius.lg, radius.full) is derived from this personality setting. Components reference semantic radius tokens rather than hard-coded values, so changing the personality in a future regeneration updates all components consistently.

---

## Color Approach

**Configuration:** primaryHex = \`${color.primaryHex}\`, ${color.paletteId ? `paletteId = \`${color.paletteId}\`` : `colorDirection = \`${color.colorDirection ?? 'cool-professional'}\``}, neutralFamily = \`${color.neutralFamily}\`

${colorRationale}

The primary color scale is generated algorithmically from the seed \`${color.primaryHex}\` by targeting specific contrast ratios at each of the 19 shade steps (50–950). This produces scales that are perceptually uniform and accessible: shades 600+ reliably pass WCAG AA contrast against white, and shades 400 and below pass against dark backgrounds.

The neutral family (\`${color.neutralFamily}\`) was selected to complement the primary hue direction. Neutrals are used for surfaces, borders, and secondary text.

---

## Spacing Density

**Configuration:** density = \`${shape.density}\`

${spacingRationale}

Component spacing (padding, gap, inner margins) derives from the component-level spacing tokens (space.component.xs through space.component.xl). Layout spacing (section gaps, page margins) derives from the layout-level spacing tokens (space.layout.xs through space.layout.xl).

---

## Shadow and Depth

**Configuration:** dimensionality = \`${shape.dimensionality}\`

${dimensionalityRationale}
`
}
