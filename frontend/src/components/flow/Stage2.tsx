import type { Density, Personality, TypeStyle, Dimensionality, TypographyConfig } from '@ds-gen/types'
import { useConfigStore } from '../../store/configStore'
import { Stage2AxisSection } from './Stage2AxisSection'
import { Stage2AxisCard } from './Stage2AxisCard'
import { Stage2CustomizeDensity } from './Stage2CustomizeDensity'
import { Stage2CustomizeTypography } from './Stage2CustomizeTypography'

const TYPE_STYLE_DEFAULTS: Record<
  TypeStyle,
  Pick<TypographyConfig, 'displayFace' | 'bodyFace' | 'codeFace' | 'scaleRatio'>
> = {
  geometric: { displayFace: 'Inter', bodyFace: 'Inter', codeFace: 'JetBrains Mono', scaleRatio: 1.25 },
  humanist: { displayFace: 'Plus Jakarta Sans', bodyFace: 'Inter', codeFace: 'JetBrains Mono', scaleRatio: 1.25 },
  'serif-accented': { displayFace: 'Fraunces', bodyFace: 'Inter', codeFace: 'JetBrains Mono', scaleRatio: 1.2 },
  'monospace-accented': { displayFace: 'JetBrains Mono', bodyFace: 'JetBrains Mono', codeFace: 'JetBrains Mono', scaleRatio: 1.333 },
}

const TYPE_STYLE_FONT_FAMILY: Record<TypeStyle, string> = {
  geometric: 'Inter, sans-serif',
  humanist: '"Plus Jakarta Sans", sans-serif',
  'serif-accented': 'Fraunces, serif',
  'monospace-accented': '"JetBrains Mono", monospace',
}

const DENSITY_OPTIONS: { value: Density; label: string; subtitle: string }[] = [
  { value: 'compact', label: 'Compact', subtitle: '3px base unit' },
  { value: 'balanced', label: 'Balanced', subtitle: '4px base unit (default)' },
  { value: 'spacious', label: 'Spacious', subtitle: '5px base unit' },
]

const PERSONALITY_OPTIONS: { value: Personality; label: string; subtitle: string }[] = [
  { value: 'professional', label: 'Professional', subtitle: 'Muted, clear hierarchy' },
  { value: 'approachable', label: 'Approachable', subtitle: 'Rounded, friendly' },
  { value: 'bold', label: 'Bold', subtitle: 'High contrast, assertive' },
  { value: 'minimal', label: 'Minimal', subtitle: 'Quiet, near-neutral' },
]

const TYPE_STYLE_OPTIONS: { value: TypeStyle; label: string; subtitle: string }[] = [
  { value: 'geometric', label: 'Geometric', subtitle: 'Inter · 1.25×' },
  { value: 'humanist', label: 'Humanist', subtitle: 'Plus Jakarta Sans · 1.25×' },
  { value: 'serif-accented', label: 'Serif-accented', subtitle: 'Fraunces · 1.2×' },
  { value: 'monospace-accented', label: 'Mono-accented', subtitle: 'JetBrains Mono · 1.333×' },
]

const DIMENSIONALITY_OPTIONS: { value: Dimensionality; label: string; subtitle: string }[] = [
  { value: 'flat', label: 'Flat', subtitle: 'No shadows, borders only' },
  { value: 'subtle', label: 'Subtle', subtitle: 'Soft shadows (default)' },
  { value: 'dimensional', label: 'Dimensional', subtitle: 'Pronounced depth' },
]

const COMING_SOON = (
  <p className="text-xs text-gray-400 italic">Advanced customization coming soon.</p>
)

export function Stage2() {
  const shape = useConfigStore((s) => s.config.shape)
  const typography = useConfigStore((s) => s.config.typography)
  const setConfig = useConfigStore((s) => s.setConfig)

  function setDensity(density: Density) {
    setConfig({ shape: { ...shape, density } })
  }

  function setPersonality(personality: Personality) {
    setConfig({ shape: { ...shape, personality } })
  }

  function setTypeStyle(typeStyle: TypeStyle) {
    setConfig({
      typography: {
        ...typography,
        typeStyle,
        source: 'chosen',
        ...TYPE_STYLE_DEFAULTS[typeStyle],
      },
    })
  }

  function setDimensionality(dimensionality: Dimensionality) {
    setConfig({ shape: { ...shape, dimensionality } })
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Style</h2>
        <p className="mt-1 text-sm text-gray-500">
          Define your spacing, personality, type, and depth.
        </p>
      </div>

      <Stage2AxisSection title="Density" customizeContent={<Stage2CustomizeDensity />}>
        {DENSITY_OPTIONS.map((opt) => (
          <Stage2AxisCard
            key={opt.value}
            label={opt.label}
            subtitle={opt.subtitle}
            isSelected={shape.density === opt.value}
            onClick={() => setDensity(opt.value)}
            preview={
              <div className="flex items-end gap-0.5 h-5">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="rounded-sm bg-blue-300"
                    style={{
                      width: opt.value === 'compact' ? 6 : opt.value === 'balanced' ? 8 : 10,
                      height: n * (opt.value === 'compact' ? 4 : opt.value === 'balanced' ? 5 : 6),
                    }}
                  />
                ))}
              </div>
            }
          />
        ))}
      </Stage2AxisSection>

      <Stage2AxisSection title="Personality" customizeContent={COMING_SOON}>
        {PERSONALITY_OPTIONS.map((opt) => {
          const radius =
            opt.value === 'professional' ? '4px'
            : opt.value === 'approachable' ? '12px'
            : opt.value === 'bold' ? '0px'
            : '2px'
          return (
            <Stage2AxisCard
              key={opt.value}
              label={opt.label}
              subtitle={opt.subtitle}
              isSelected={shape.personality === opt.value}
              onClick={() => setPersonality(opt.value)}
              preview={
                <div
                  className="h-6 w-full border-2 border-blue-400 bg-blue-50"
                  style={{ borderRadius: radius }}
                />
              }
            />
          )
        })}
      </Stage2AxisSection>

      <Stage2AxisSection title="Type Style" customizeContent={<Stage2CustomizeTypography />}>
        {TYPE_STYLE_OPTIONS.map((opt) => (
          <Stage2AxisCard
            key={opt.value}
            label={opt.label}
            subtitle={opt.subtitle}
            isSelected={typography.typeStyle === opt.value}
            onClick={() => setTypeStyle(opt.value)}
            preview={
              <span
                className="text-base font-medium text-gray-800 leading-none"
                style={{ fontFamily: TYPE_STYLE_FONT_FAMILY[opt.value] }}
              >
                Aa
              </span>
            }
          />
        ))}
      </Stage2AxisSection>

      <Stage2AxisSection title="Dimensionality" customizeContent={COMING_SOON}>
        {DIMENSIONALITY_OPTIONS.map((opt) => {
          const shadow =
            opt.value === 'flat' ? 'none'
            : opt.value === 'subtle' ? '0 2px 6px rgb(0 0 0 / 0.08)'
            : '0 4px 12px rgb(0 0 0 / 0.16)'
          return (
            <Stage2AxisCard
              key={opt.value}
              label={opt.label}
              subtitle={opt.subtitle}
              isSelected={shape.dimensionality === opt.value}
              onClick={() => setDimensionality(opt.value)}
              preview={
                <div
                  className="h-6 w-full rounded bg-white border border-gray-100"
                  style={{ boxShadow: shadow }}
                />
              }
            />
          )
        })}
      </Stage2AxisSection>
    </div>
  )
}
