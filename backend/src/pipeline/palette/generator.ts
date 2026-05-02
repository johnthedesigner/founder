import chroma from 'chroma-js'
import type { ColorScale } from '@ds-gen/types'

// Contrast targets vs white for shades 50–450, vs black for shades 500–950.
// Monotonically increasing toward shade 450 (darker = more contrast vs white),
// monotonically decreasing from shade 500 (lighter = more contrast vs black).
export const TARGET_CONTRASTS: Record<number, number> = {
  50: 1.05,
  100: 1.15,
  150: 1.3,
  200: 1.6,
  250: 2.1,
  300: 2.9,
  350: 3.9,
  400: 5.0,
  450: 6.5,
  500: 3.0,
  550: 2.5,
  600: 2.0,
  650: 1.7,
  700: 1.45,
  750: 1.3,
  800: 1.18,
  850: 1.12,
  900: 1.08,
  950: 1.04,
}

const SHADE_KEYS = [
  50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750,
  800, 850, 900, 950,
]

const POOL_SIZE = 300

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi)
}

function buildCandidatePool(seedHex: string): string[] {
  const [rawH, rawS, rawV] = chroma(seedHex).hsv()
  const h = Number.isNaN(rawH) ? 0 : rawH
  const pool: string[] = []

  for (let i = 0; i < POOL_SIZE; i++) {
    const t = i / POOL_SIZE
    // Light candidates: high value, low saturation
    pool.push(
      chroma
        .hsv(h, clamp(rawS * (1 - t * 0.8), 0, 1), clamp(0.98 - t * 0.0, 0, 1))
        .hex(),
    )
    // Full saturation sweep across luminance
    pool.push(
      chroma
        .hsv(h, clamp(rawS + t * 0.1, 0, 1), clamp(rawV + (1 - rawV) * (1 - t), 0, 1))
        .hex(),
    )
    // Dark candidates: low value, moderate saturation
    pool.push(
      chroma
        .hsv(h, clamp(rawS * (1 - t * 0.3), 0, 1), clamp(t * 0.15, 0, 1))
        .hex(),
    )
    // Pure luminance gradient
    pool.push(chroma.hsl(h, rawS, t).hex())
  }

  return pool
}

export function generateColorScale(seedHex: string): ColorScale {
  const candidates = buildCandidatePool(seedHex)
  const scale: ColorScale = {}

  for (const shade of SHADE_KEYS) {
    const target = TARGET_CONTRASTS[shade]
    const ref = shade < 500 ? '#ffffff' : '#000000'
    let best = candidates[0]
    let bestDiff = Infinity

    for (const c of candidates) {
      const diff = Math.abs(chroma.contrast(c, ref) - target)
      if (diff < bestDiff) {
        bestDiff = diff
        best = c
      }
    }

    scale[shade] = best
  }

  return scale
}
