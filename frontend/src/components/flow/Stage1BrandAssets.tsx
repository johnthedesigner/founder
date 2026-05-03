import { useState } from 'react'
import { useConfigStore } from '../../store/configStore'
import { Stage1ColorDirection } from './Stage1ColorDirection'

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

export function Stage1BrandAssets() {
  const color = useConfigStore((s) => s.config.color)
  const typography = useConfigStore((s) => s.config.typography)
  const setConfig = useConfigStore((s) => s.setConfig)

  const isProvided = color.source === 'provided'
  const [hexDraft, setHexDraft] = useState(isProvided ? color.primaryHex : '')
  const [hexError, setHexError] = useState(false)

  function selectSource(provided: boolean) {
    if (provided) {
      setConfig({ color: { ...color, source: 'provided' } })
    } else {
      setHexDraft('')
      setHexError(false)
      setConfig({ color: { ...color, source: 'generated' } })
    }
  }

  function handleHexChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setHexDraft(value)
    setHexError(false)
    // Apply immediately when the value is a valid complete hex
    if (HEX_PATTERN.test(value)) {
      setConfig({ color: { ...color, primaryHex: value, source: 'provided' } })
    }
  }

  function handleHexBlur() {
    if (hexDraft.trim() === '') return
    if (!HEX_PATTERN.test(hexDraft)) {
      setHexError(true)
    }
  }

  function handleDisplayFaceChange(e: React.ChangeEvent<HTMLInputElement>) {
    setConfig({ typography: { ...typography, displayFace: e.target.value, source: 'provided' } })
  }

  function handleBodyFaceChange(e: React.ChangeEvent<HTMLInputElement>) {
    setConfig({ typography: { ...typography, bodyFace: e.target.value, source: 'provided' } })
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Brand assets</h3>
      <div className="space-y-2">
        <button
          onClick={() => selectSource(false)}
          className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
            !isProvided
              ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="text-sm font-medium text-gray-900">Starting fresh</div>
          <div className="mt-0.5 text-xs text-gray-500">
            Pick a color direction and we'll generate everything.
          </div>
        </button>

        <button
          onClick={() => selectSource(true)}
          className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
            isProvided
              ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="text-sm font-medium text-gray-900">I have brand assets</div>
          <div className="mt-0.5 text-xs text-gray-500">
            Provide a primary hex color and typefaces.
          </div>
        </button>
      </div>

      {isProvided && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Primary brand color
            </label>
            <div className="flex items-center gap-2">
              <div
                className="h-8 w-8 shrink-0 rounded border border-gray-200"
                style={{
                  backgroundColor: HEX_PATTERN.test(hexDraft) ? hexDraft : '#e5e7eb',
                }}
              />
              <input
                type="text"
                value={hexDraft}
                onChange={handleHexChange}
                onBlur={handleHexBlur}
                placeholder="#3b82f6"
                className={`w-full rounded-md border px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 ${
                  hexError
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
            </div>
            {hexError && (
              <p className="mt-1 text-xs text-red-500">
                Enter a valid hex color (e.g. #e63946)
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Display typeface <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={typography.displayFace}
              onChange={handleDisplayFaceChange}
              placeholder="Inter"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Body typeface <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={typography.bodyFace}
              onChange={handleBodyFaceChange}
              placeholder="Inter"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {!isProvided && (
        <div className="mt-4">
          <Stage1ColorDirection />
        </div>
      )}
    </div>
  )
}
