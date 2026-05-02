import type { TokenSet } from '@ds-gen/types'

function inferType(value: string): string {
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return 'color'
  if (/^-?\d+(\.\d+)?(px|rem|em|ch|vw|vh|%)$/.test(value)) return 'dimension'
  if (/^-?\d+(\.\d+)?$/.test(value)) return 'number'
  return 'other'
}

function isAlias(value: string): boolean {
  return /^[a-z][\w-]*(\.[a-z][\w-]+)+$/.test(value)
}

function makeLeaf(value: string): Record<string, unknown> {
  if (isAlias(value)) {
    return { $value: `{${value}}`, $type: 'other' }
  }
  return { $value: value, $type: inferType(value) }
}

function setNested(
  target: Record<string, unknown>,
  keyPath: string[],
  leaf: Record<string, unknown>,
): void {
  let node = target
  for (let i = 0; i < keyPath.length - 1; i++) {
    const segment = keyPath[i]!
    if (typeof node[segment] !== 'object' || node[segment] === null) {
      node[segment] = {}
    }
    node = node[segment] as Record<string, unknown>
  }
  const last = keyPath[keyPath.length - 1]!
  node[last] = leaf
}

function buildDTCG(
  obj: Record<string, unknown>,
  prefix: string[] = [],
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [rawKey, value] of Object.entries(obj)) {
    const keyParts = rawKey.split('.')
    const fullPath = [...prefix, ...keyParts]

    if (typeof value === 'string') {
      setNested(result, keyParts, makeLeaf(value))
    } else if (value !== null && typeof value === 'object') {
      // SemanticColorValue { light: string, dark?: string }
      if ('light' in value && typeof (value as Record<string, unknown>).light === 'string') {
        const cv = value as { light: string; dark?: string }
        const leaf: Record<string, unknown> = { $value: cv.light, $type: 'color' }
        if (cv.dark) leaf['$extensions'] = { 'mode-dark': cv.dark }
        setNested(result, keyParts, leaf)
        continue
      }
      // Nested object — recurse and merge under the rawKey segment
      const nested = buildDTCG(value as Record<string, unknown>, fullPath)
      setNested(result, keyParts, nested)
    }
  }

  return result
}

export function serializeToW3C(tokenSet: TokenSet): string {
  const dtcg = buildDTCG(tokenSet as Record<string, unknown>)
  return JSON.stringify(dtcg, null, 2)
}
