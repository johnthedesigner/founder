import type { ColorScale } from '@ds-gen/types'

function linearize(channel: number): number {
  const s = channel / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ]
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return (
    0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
  )
}

export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1)
  const l2 = relativeLuminance(hex2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function meetsAA(
  fg: string,
  bg: string,
  largeText = false,
): boolean {
  return contrastRatio(fg, bg) >= (largeText ? 3.0 : 4.5)
}

export function meetsAAA(
  fg: string,
  bg: string,
  largeText = false,
): boolean {
  return contrastRatio(fg, bg) >= (largeText ? 4.5 : 7.0)
}

// Returns the hex from scale that passes minRatio against background with
// the smallest ratio that still qualifies (closest-passing step).
export function findAccessibleStep(
  scale: ColorScale,
  background: string,
  minRatio: number,
): string {
  const passing = Object.values(scale)
    .map((hex) => ({ hex, ratio: contrastRatio(hex, background) }))
    .filter((e) => e.ratio >= minRatio)

  if (passing.length === 0) {
    throw new Error(
      `No step in scale meets contrast ratio ${minRatio} against ${background}`,
    )
  }

  return passing.reduce((a, b) => (a.ratio < b.ratio ? a : b)).hex
}
