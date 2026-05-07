import { z } from 'zod'

export type ProjectType = 'saas' | 'marketing' | 'mobile'

export type ComponentCategory =
  | 'forms'
  | 'navigation'
  | 'overlays'
  | 'feedback'
  | 'data-display'
  | 'layout'

export type ColorMode = 'light' | 'dark'

export type Density = 'compact' | 'balanced' | 'spacious'
export type Personality = 'professional' | 'approachable' | 'bold' | 'minimal'
export type TypeStyle = 'geometric' | 'humanist' | 'serif-accented' | 'monospace-accented'
export type Dimensionality = 'flat' | 'subtle' | 'dimensional'

export type ColorSource = 'provided' | 'generated' | 'preset'
export type FunctionalColorRole = 'error' | 'warning' | 'success' | 'info'
export type ColorDirection =
  | 'cool-professional'
  | 'warm-approachable'
  | 'bold-high-contrast'
  | 'neutral-minimal'
  | 'earth-tones'

export interface FunctionalColorsConfig {
  enabled: FunctionalColorRole[]
  overrides?: Partial<Record<FunctionalColorRole, string>>
}

export interface ColorConfig {
  source: ColorSource
  primaryHex: string
  secondaryHex?: string
  accentHex?: string
  colorDirection?: ColorDirection
  paletteId?: string
  functionalColors?: FunctionalColorsConfig
  neutralFamily: 'gray' | 'slate' | 'zinc' | 'stone' | 'warm-gray'
}

export interface TypographyConfig {
  source: 'provided' | 'chosen'
  typeStyle: TypeStyle
  displayFace: string
  bodyFace: string
  codeFace: string
  scaleRatio: 1.2 | 1.25 | 1.333
}

export interface ShapeConfig {
  density: Density
  personality: Personality
  dimensionality: Dimensionality
}

export interface ProjectConfig {
  projectType: ProjectType
  componentScope: ComponentCategory[]
  modes: ColorMode[]
  color: ColorConfig
  typography: TypographyConfig
  shape: ShapeConfig
}

// ---- Zod schemas ----

const hexColorRegex = /^#[0-9a-fA-F]{6}$/

export const ProjectTypeSchema = z.enum(['saas', 'marketing', 'mobile'])

export const ComponentCategorySchema = z.enum([
  'forms',
  'navigation',
  'overlays',
  'feedback',
  'data-display',
  'layout',
])

export const ColorModeSchema = z.enum(['light', 'dark'])

export const DensitySchema = z.enum(['compact', 'balanced', 'spacious'])

export const PersonalitySchema = z.enum(['professional', 'approachable', 'bold', 'minimal'])

export const TypeStyleSchema = z.enum([
  'geometric',
  'humanist',
  'serif-accented',
  'monospace-accented',
])

export const DimensionalitySchema = z.enum(['flat', 'subtle', 'dimensional'])

export const ColorSourceSchema = z.enum(['provided', 'generated', 'preset'])
export const FunctionalColorRoleSchema = z.enum(['error', 'warning', 'success', 'info'])

export const ColorDirectionSchema = z.enum([
  'cool-professional',
  'warm-approachable',
  'bold-high-contrast',
  'neutral-minimal',
  'earth-tones',
])

export const FunctionalColorsConfigSchema = z.object({
  enabled: z.array(FunctionalColorRoleSchema),
  overrides: z
    .object({
      error: z.string().regex(hexColorRegex).optional(),
      warning: z.string().regex(hexColorRegex).optional(),
      success: z.string().regex(hexColorRegex).optional(),
      info: z.string().regex(hexColorRegex).optional(),
    })
    .optional(),
})

export const ColorConfigSchema = z.object({
  source: ColorSourceSchema,
  primaryHex: z.string().regex(hexColorRegex, 'primaryHex must be a 6-digit hex color'),
  secondaryHex: z
    .string()
    .regex(hexColorRegex, 'secondaryHex must be a 6-digit hex color')
    .optional(),
  accentHex: z
    .string()
    .regex(hexColorRegex, 'accentHex must be a 6-digit hex color')
    .optional(),
  colorDirection: ColorDirectionSchema.optional(),
  paletteId: z.string().optional(),
  functionalColors: FunctionalColorsConfigSchema.optional(),
  neutralFamily: z.enum(['gray', 'slate', 'zinc', 'stone', 'warm-gray']),
})

export const TypographyConfigSchema = z.object({
  source: z.enum(['provided', 'chosen']),
  typeStyle: TypeStyleSchema,
  displayFace: z.string().min(1),
  bodyFace: z.string().min(1),
  codeFace: z.string().min(1),
  scaleRatio: z.union([z.literal(1.2), z.literal(1.25), z.literal(1.333)]),
})

export const ShapeConfigSchema = z.object({
  density: DensitySchema,
  personality: PersonalitySchema,
  dimensionality: DimensionalitySchema,
})

export const ProjectConfigSchema = z.object({
  projectType: ProjectTypeSchema,
  componentScope: z.array(ComponentCategorySchema).min(1),
  modes: z.array(ColorModeSchema).min(1),
  color: ColorConfigSchema,
  typography: TypographyConfigSchema,
  shape: ShapeConfigSchema,
})
