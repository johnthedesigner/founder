import { useState, useEffect } from 'react'
import type { GeneratedSystem, PrimitiveTokenSet, SemanticTokenSet, ComponentTokenSet } from '@ds-gen/types'
import { generate } from '@pipeline/index'
import { useConfigStore } from '../../store/configStore'

function countPrimitives(p: PrimitiveTokenSet) {
  const colorTokens = Object.values(p.colors).reduce(
    (sum, scale) => sum + Object.keys(scale).length,
    0,
  )
  const scales = Object.keys(p.colors).length + 4 // + spacing, typeSizes, radii, shadows
  const total =
    colorTokens +
    Object.keys(p.spacing).length +
    Object.keys(p.typeSizes).length +
    Object.keys(p.radii).length +
    Object.keys(p.shadows).length
  return { total, scales }
}

function countSemantic(s: SemanticTokenSet) {
  return (
    Object.keys(s.colors).length +
    Object.keys(s.typography).length +
    Object.keys(s.spacing).length +
    Object.keys(s.radii).length +
    Object.keys(s.shadows).length
  )
}

function countComponents(c: ComponentTokenSet) {
  return Object.values(c).reduce((sum, tokens) => sum + Object.keys(tokens).length, 0)
}

function getFileContent(system: GeneratedSystem, path: string): string {
  return system.files.find((f) => f.path === path)?.content ?? '{}'
}

interface SectionProps {
  title: string
  summary: string
  tokens: [string, string][]
  rawJson: string
}

function TokenSection({ title, summary, tokens, rawJson }: SectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showJson, setShowJson] = useState(false)

  return (
    <div className="rounded-lg border border-gray-100 overflow-hidden">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div>
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          <span className="ml-2 text-xs text-gray-500">{summary}</span>
        </div>
        <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="border-t border-gray-100">
          <div className="flex justify-end px-4 py-2 border-b border-gray-50">
            <button
              onClick={() => setShowJson((v) => !v)}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              {showJson ? 'Hide JSON' : 'View raw JSON'}
            </button>
          </div>

          {showJson ? (
            <pre className="overflow-auto max-h-64 px-4 py-3 text-xs text-gray-600 font-mono leading-relaxed bg-white">
              {rawJson}
            </pre>
          ) : (
            <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
              {tokens.map(([name, value]) => {
                const isHex = /^#[0-9a-fA-F]{6}$/.test(value)
                return (
                  <div key={name} className="flex items-center justify-between px-4 py-1.5">
                    <span className="text-xs font-mono text-gray-600">{name}</span>
                    <div className="flex items-center gap-1.5">
                      {isHex && (
                        <span
                          className="inline-block h-3 w-3 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: value }}
                          aria-hidden
                        />
                      )}
                      <span className="text-xs text-gray-400 font-mono max-w-[120px] truncate text-right">
                        {value}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function Stage3TokenSummary() {
  const config = useConfigStore((s) => s.config)
  const [system, setSystem] = useState<GeneratedSystem | null>(null)

  useEffect(() => {
    // Run generation off the first render to avoid blocking paint
    const id = setTimeout(() => {
      try {
        setSystem(generate(config))
      } catch {
        // If generation fails, section stays null and shows placeholder
      }
    }, 0)
    return () => clearTimeout(id)
  }, [config])

  if (!system) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-gray-100" />
        ))}
      </div>
    )
  }

  const { primitives, semantic, component } = system.tokens
  const primCount = countPrimitives(primitives)
  const semCount = countSemantic(semantic)
  const compCount = countComponents(component)
  const compNames = Object.keys(component).length

  const primTokens: [string, string][] = [
    ...Object.entries(primitives.colors).flatMap(([scaleName, scale]) =>
      Object.entries(scale).map(([shade, value]) => [`color.${scaleName}.${shade}`, value] as [string, string]),
    ),
    ...Object.entries(primitives.spacing).map(([k, v]) => [`spacing.${k}`, v] as [string, string]),
    ...Object.entries(primitives.radii).map(([k, v]) => [`radii.${k}`, v] as [string, string]),
    ...Object.entries(primitives.shadows).map(([k, v]) => [`shadows.${k}`, v] as [string, string]),
    ...Object.entries(primitives.typeSizes).map(([k, v]) => [`type.${k}`, v] as [string, string]),
  ]

  const semTokens: [string, string][] = [
    ...Object.entries(semantic.colors).map(([k, v]) => [`color.${k}`, v.light] as [string, string]),
    ...Object.entries(semantic.typography).map(([k, v]) => [`type.${k}`, v] as [string, string]),
    ...Object.entries(semantic.spacing).map(([k, v]) => [`space.${k}`, v] as [string, string]),
  ]

  const compTokens: [string, string][] = Object.entries(component).flatMap(([comp, tokens]) =>
    Object.entries(tokens).map(([k, v]) => [`${comp}.${k}`, v] as [string, string]),
  )

  return (
    <div className="space-y-2">
      <TokenSection
        title="Primitives"
        summary={`${primCount.total} tokens · ${primCount.scales} scales`}
        tokens={primTokens}
        rawJson={JSON.stringify(JSON.parse(getFileContent(system, 'tokens/primitives.json')), null, 2)}
      />
      <TokenSection
        title="Semantic"
        summary={`${semCount} tokens`}
        tokens={semTokens}
        rawJson={JSON.stringify(JSON.parse(getFileContent(system, 'tokens/semantic.json')), null, 2)}
      />
      <TokenSection
        title="Components"
        summary={`${compCount} tokens · ${compNames} components`}
        tokens={compTokens}
        rawJson={JSON.stringify(JSON.parse(getFileContent(system, 'tokens/component.json')), null, 2)}
      />
    </div>
  )
}
