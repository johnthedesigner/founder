import { useState } from 'react'
import type { Density } from '@ds-gen/types'
import { useConfigStore } from '../../store/configStore'

const DENSITY_BASE_PX: Record<Density, number> = {
  compact: 3,
  balanced: 4,
  spacious: 5,
}

function pxToNearestDensity(px: number): Density {
  if (px <= 3.5) return 'compact'
  if (px <= 4.5) return 'balanced'
  return 'spacious'
}

export function Stage2CustomizeDensity() {
  const shape = useConfigStore((s) => s.config.shape)
  const setConfig = useConfigStore((s) => s.setConfig)

  const [baseUnit, setBaseUnit] = useState(DENSITY_BASE_PX[shape.density])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = parseFloat(e.target.value)
    if (isNaN(value)) return
    setBaseUnit(value)
    setConfig({ shape: { ...shape, density: pxToNearestDensity(value) } })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Base spacing unit
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={8}
            step={0.5}
            value={baseUnit}
            onChange={handleChange}
            className="flex-1 accent-blue-600"
          />
          <span className="w-12 text-right text-xs font-mono text-gray-700">
            {baseUnit}px
          </span>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Derived scale</p>
        <div className="grid grid-cols-4 gap-1.5">
          {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
            <div key={n} className="flex flex-col items-start gap-0.5">
              <div
                className="h-2 rounded-sm bg-blue-400"
                style={{ width: `${Math.min(n * baseUnit * 3, 80)}px` }}
              />
              <span className="text-xs text-gray-400 font-mono">
                space-{n} = {Math.round(n * baseUnit)}px
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
