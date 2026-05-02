import type { GeneratedSystem } from '@ds-gen/types'

function cssVar(key: string): string {
  return `--${key.replace(/\./g, '-')}`
}

export function generateTokensDoc(system: GeneratedSystem): string {
  const { semantic } = system.tokens

  const colorRows = Object.entries(semantic.colors)
    .map(([key, val]) => {
      const dark = val.dark ? ` / \`${val.dark}\` (dark)` : ''
      return `| \`${key}\` | \`${cssVar(key)}\` | \`${val.light}\`${dark} |`
    })
    .join('\n')

  const typographyRows = Object.entries(semantic.typography)
    .map(([key, val]) => `| \`${key}\` | \`${cssVar(key)}\` | \`${val}\` |`)
    .join('\n')

  const spacingRows = Object.entries(semantic.spacing)
    .map(([key, val]) => `| \`${key}\` | \`${cssVar(key)}\` | \`${val}\` |`)
    .join('\n')

  const radiiRows = Object.entries(semantic.radii)
    .map(([key, val]) => `| \`${key}\` | \`${cssVar(key)}\` | \`${val}\` |`)
    .join('\n')

  const shadowRows = Object.entries(semantic.shadows)
    .map(([key, val]) => `| \`${key}\` | \`${cssVar(key)}\` | \`${val}\` |`)
    .join('\n')

  const correctionSection =
    semantic.corrections.length > 0
      ? `\n## Automatic Corrections\n\nThe following token values were adjusted during generation to meet WCAG AA contrast requirements:\n\n| Token | Original | Corrected | Reason |\n|---|---|---|---|\n${semantic.corrections.map((c) => `| \`${c.token}\` | \`${c.originalValue}\` | \`${c.correctedValue}\` | ${c.reason} |`).join('\n')}\n`
      : ''

  return `# Token Reference

This document lists every design token produced by the generator. Tokens are organized by layer. Reference each token in your CSS via the custom property name (e.g. \`var(--color-action-primary)\`).

---

## Layer 1 — Semantic Color Tokens

Semantic tokens express the *intent* of a color (action, surface, text, border, feedback) rather than the raw hue. They resolve to different values in light and dark mode.

| Token name | CSS custom property | Value |
|---|---|---|
${colorRows}

---

## Layer 2 — Typography Tokens

Typography tokens cover font families, the full type scale, font weights, and line heights.

| Token name | CSS custom property | Value |
|---|---|---|
${typographyRows}

---

## Layer 3 — Spacing Tokens

| Token name | CSS custom property | Value |
|---|---|---|
${spacingRows}

---

## Layer 4 — Radii Tokens

| Token name | CSS custom property | Value |
|---|---|---|
${radiiRows}

---

## Layer 5 — Shadow Tokens

| Token name | CSS custom property | Value |
|---|---|---|
${shadowRows}
${correctionSection}`
}
