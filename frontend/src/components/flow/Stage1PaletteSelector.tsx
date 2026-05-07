import { PALETTE_PRESETS } from '@ds-gen/types'
import type { PalettePreset } from '@ds-gen/types'
import { useConfigStore } from '../../store/configStore'

export function Stage1PaletteSelector() {
  const color = useConfigStore((s) => s.config.color)
  const setColor = useConfigStore((s) => s.setColor)

  const selectedId = color.source === 'preset' ? color.paletteId : null

  function selectPreset(preset: PalettePreset) {
    setColor({
      source: 'preset',
      paletteId: preset.id,
      primaryHex: preset.primaryHex,
      secondaryHex: preset.secondaryHex,
      accentHex: preset.accentHex,
    })
  }

  function selectCustom() {
    setColor({ source: 'provided', paletteId: undefined })
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Color palette</h3>
      <div className="grid grid-cols-2 gap-2">
        {PALETTE_PRESETS.map((preset) => {
          const isSelected = selectedId === preset.id
          const swatches = [
            preset.primaryHex,
            preset.secondaryHex,
            preset.accentHex,
          ].filter(Boolean) as string[]

          return (
            <button
              key={preset.id}
              onClick={() => selectPreset(preset)}
              className={`text-left rounded-lg border px-3 py-2.5 transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex gap-1.5 mb-1.5">
                {swatches.map((hex) => (
                  <span
                    key={hex}
                    className="inline-block h-4 w-4 rounded-full border border-black/10"
                    style={{ backgroundColor: hex }}
                    aria-hidden
                  />
                ))}
              </div>
              <div className="text-xs font-medium text-gray-900">{preset.name}</div>
              <div className="mt-0.5 text-xs text-gray-500 leading-tight">{preset.description}</div>
            </button>
          )
        })}

        <button
          onClick={selectCustom}
          className={`text-left rounded-lg border px-3 py-2.5 transition-colors ${
            !selectedId
              ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex gap-1.5 mb-1.5">
            <span
              className="inline-block h-4 w-4 rounded-full border border-dashed border-gray-400 bg-white"
              aria-hidden
            />
          </div>
          <div className="text-xs font-medium text-gray-900">Custom</div>
          <div className="mt-0.5 text-xs text-gray-500 leading-tight">Enter your own brand colors.</div>
        </button>
      </div>
    </div>
  )
}
