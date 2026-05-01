import type { ProjectConfig } from './config'

// Shade keys: 50, 100, 150, 200, ... 950 (19 steps)
export type ColorScale = Record<number, string>

export interface GeneratedFile {
  path: string
  content: string
}

// Base type for W3C DTCG token nodes
export type TokenSet = Record<string, unknown>

export interface PrimitiveTokenSet {
  colors: Record<string, ColorScale>
  spacing: Record<string, string>
  typeSizes: Record<string, string>
  radii: Record<string, string>
  shadows: Record<string, string>
}

export interface SemanticColorValue {
  light: string
  dark?: string
}

export interface TokenCorrection {
  token: string
  originalValue: string
  correctedValue: string
  reason: string
}

export interface SemanticTokenSet {
  colors: Record<string, SemanticColorValue>
  typography: Record<string, string>
  spacing: Record<string, string>
  radii: Record<string, string>
  shadows: Record<string, string>
  corrections: TokenCorrection[]
}

export interface ComponentTokenSet {
  [componentName: string]: Record<string, string>
}

export interface ComponentSpec {
  name: string
  importPath: string
  baseUIComponent: string
  variants: string[]
  sizes: string[]
  defaultVariant: string
  defaultSize: string
  tokenRefs: string[]
  accessibilityNotes: string
  usageGuidance: string
}

export interface GeneratedSystem {
  config: ProjectConfig
  tokens: {
    primitives: PrimitiveTokenSet
    semantic: SemanticTokenSet
    component: ComponentTokenSet
  }
  components: ComponentSpec[]
  files: GeneratedFile[]
  metadata: {
    generatedAt: string
    corrections: TokenCorrection[]
  }
}
