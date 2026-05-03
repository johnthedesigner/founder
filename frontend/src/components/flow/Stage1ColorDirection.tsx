import type { ColorDirection } from '@ds-gen/types'
import { useConfigStore } from '../../store/configStore'

const COLOR_DIRECTION_HEX: Record<ColorDirection, string> = {
  'cool-professional': '#3b82f6',
  'warm-approachable': '#f59e0b',
  'bold-high-contrast': '#dc2626',
  'neutral-minimal': '#6b7280',
  'earth-tones': '#92400e',
}

const COLOR_DIRECTIONS: { value: ColorDirection; label: string; description: string }[] = [
  {
    value: 'cool-professional',
    label: 'Cool & Professional',
    description: 'Clear blue — confident, trustworthy, enterprise-ready.',
  },
  {
    value: 'warm-approachable',
    label: 'Warm & Approachable',
    description: 'Amber tones — friendly, energetic, consumer-facing.',
  },
  {
    value: 'bold-high-contrast',
    label: 'Bold & High Contrast',
    description: 'Vivid red — assertive, high-impact, attention-grabbing.',
  },
  {
    value: 'neutral-minimal',
    label: 'Neutral & Minimal',
    description: 'Greyed palette — calm, focused, content-forward.',
  },
  {
    value: 'earth-tones',
    label: 'Earth Tones',
    description: 'Warm browns — grounded, natural, artisanal.',
  },
]

export function Stage1ColorDirection() {
  const colorDirection = useConfigStore((s) => s.config.color.colorDirection)
  const color = useConfigStore((s) => s.config.color)
  const setConfig = useConfigStore((s) => s.setConfig)

  function selectDirection(dir: ColorDirection) {
    setConfig({
      color: {
        ...color,
        colorDirection: dir,
        primaryHex: COLOR_DIRECTION_HEX[dir],
        source: 'generated',
      },
    })
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Color direction</h3>
      <div className="space-y-2">
        {COLOR_DIRECTIONS.map((dir) => {
          const isSelected = colorDirection === dir.value
          const hex = COLOR_DIRECTION_HEX[dir.value]
          return (
            <button
              key={dir.value}
              onClick={() => selectDirection(dir.value)}
              className={`w-full text-left rounded-lg border px-4 py-3 transition-colors flex items-center gap-3 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div
                className="h-8 w-8 shrink-0 rounded-md"
                style={{ backgroundColor: hex }}
                aria-hidden
              />
              <div>
                <div className="text-sm font-medium text-gray-900">{dir.label}</div>
                <div className="mt-0.5 text-xs text-gray-500">{dir.description}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
