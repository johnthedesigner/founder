import { useConfigStore } from '../../store/configStore'
import { Stage1PaletteSelector } from './Stage1PaletteSelector'
import { Stage1BrandColors } from './Stage1BrandColors'

export function Stage1BrandAssets() {
  const typography = useConfigStore((s) => s.config.typography)
  const setConfig = useConfigStore((s) => s.setConfig)

  function handleDisplayFaceChange(e: React.ChangeEvent<HTMLInputElement>) {
    setConfig({ typography: { ...typography, displayFace: e.target.value, source: 'provided' } })
  }

  function handleBodyFaceChange(e: React.ChangeEvent<HTMLInputElement>) {
    setConfig({ typography: { ...typography, bodyFace: e.target.value, source: 'provided' } })
  }

  return (
    <div className="space-y-6">
      <Stage1PaletteSelector />

      <Stage1BrandColors />

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Typefaces <span className="font-normal text-gray-400 text-xs">(optional)</span>
        </h3>
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Display typeface</label>
            <input
              type="text"
              value={typography.displayFace}
              onChange={handleDisplayFaceChange}
              placeholder="Inter"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Body typeface</label>
            <input
              type="text"
              value={typography.bodyFace}
              onChange={handleBodyFaceChange}
              placeholder="Inter"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
