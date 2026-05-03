import { useConfigStore } from '../../store/configStore'

const SCALE_RATIOS = [
  { value: 1.2 as const, label: '1.2 — Minor Third' },
  { value: 1.25 as const, label: '1.25 — Major Third' },
  { value: 1.333 as const, label: '1.333 — Perfect Fourth' },
]

export function Stage2CustomizeTypography() {
  const typography = useConfigStore((s) => s.config.typography)
  const setConfig = useConfigStore((s) => s.setConfig)

  function update(partial: Partial<typeof typography>) {
    setConfig({ typography: { ...typography, ...partial } })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Display typeface</label>
        <input
          type="text"
          value={typography.displayFace}
          onChange={(e) => update({ displayFace: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Body typeface</label>
        <input
          type="text"
          value={typography.bodyFace}
          onChange={(e) => update({ bodyFace: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Code typeface</label>
        <input
          type="text"
          value={typography.codeFace}
          onChange={(e) => update({ codeFace: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Scale ratio</label>
        <select
          value={typography.scaleRatio}
          onChange={(e) => update({ scaleRatio: parseFloat(e.target.value) as 1.2 | 1.25 | 1.333 })}
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {SCALE_RATIOS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
