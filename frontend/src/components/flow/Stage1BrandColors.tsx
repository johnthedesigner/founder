import { useState, useEffect } from 'react'
import { useConfigStore } from '../../store/configStore'

const HEX_RE = /^#[0-9a-fA-F]{6}$/

function normalizeHex(raw: string): string {
  const trimmed = raw.trim()
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed}`
  return trimmed
}

interface ColorRowProps {
  label: string
  required?: boolean
  hex: string
  onCommit: (hex: string) => void
}

function ColorRow({ label, required, hex, onCommit }: ColorRowProps) {
  const [draft, setDraft] = useState(hex)

  useEffect(() => {
    setDraft(hex)
  }, [hex])

  function handlePicker(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setDraft(value)
    onCommit(value)
  }

  function handleText(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setDraft(value)
    const normalized = normalizeHex(value)
    if (HEX_RE.test(normalized)) {
      onCommit(normalized)
    }
  }

  function handleBlur() {
    const normalized = normalizeHex(draft)
    if (!HEX_RE.test(normalized)) {
      setDraft(hex) // revert to last committed value
    }
  }

  const displayHex = HEX_RE.test(normalizeHex(draft)) ? normalizeHex(draft) : hex

  return (
    <div className="flex items-center gap-3">
      <div className="w-20 shrink-0">
        <span className="text-xs font-medium text-gray-700">
          {label}
          {required && <span className="text-gray-400 ml-0.5">*</span>}
        </span>
      </div>
      <label className="relative cursor-pointer">
        <input
          type="color"
          value={displayHex}
          onChange={handlePicker}
          className="sr-only"
        />
        <span
          className="block h-8 w-8 rounded-md border border-gray-300 cursor-pointer shadow-sm hover:border-gray-400 transition-colors"
          style={{ backgroundColor: displayHex }}
          aria-label={`${label} color picker`}
        />
      </label>
      <input
        type="text"
        value={draft}
        onChange={handleText}
        onBlur={handleBlur}
        placeholder="#3b82f6"
        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )
}

interface OptionalColorRowProps {
  label: string
  hex: string | undefined
  onEnable: () => void
  onDisable: () => void
  onCommit: (hex: string) => void
}

function OptionalColorRow({ label, hex, onEnable, onDisable, onCommit }: OptionalColorRowProps) {
  const enabled = !!hex
  const effectiveHex = hex ?? '#6b7280'

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => (e.target.checked ? onEnable() : onDisable())}
          className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
        />
        <span className="text-xs font-medium text-gray-700">{label} <span className="font-normal text-gray-400">(optional)</span></span>
      </label>
      {enabled && (
        <ColorRow label={label} hex={effectiveHex} onCommit={onCommit} />
      )}
    </div>
  )
}

export function Stage1BrandColors() {
  const color = useConfigStore((s) => s.config.color)
  const setColor = useConfigStore((s) => s.setColor)

  function clearPresetIfNeeded(partial: Parameters<typeof setColor>[0]) {
    if (color.source === 'preset') {
      setColor({ ...partial, source: 'provided', paletteId: undefined })
    } else {
      setColor(partial)
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Brand colors</h3>
      <div className="space-y-3">
        <ColorRow
          label="Primary"
          required
          hex={color.primaryHex}
          onCommit={(hex) => clearPresetIfNeeded({ primaryHex: hex })}
        />
        <OptionalColorRow
          label="Secondary"
          hex={color.secondaryHex}
          onEnable={() => clearPresetIfNeeded({ secondaryHex: color.primaryHex })}
          onDisable={() => clearPresetIfNeeded({ secondaryHex: undefined })}
          onCommit={(hex) => clearPresetIfNeeded({ secondaryHex: hex })}
        />
        <OptionalColorRow
          label="Accent"
          hex={color.accentHex}
          onEnable={() => clearPresetIfNeeded({ accentHex: color.primaryHex })}
          onDisable={() => clearPresetIfNeeded({ accentHex: undefined })}
          onCommit={(hex) => clearPresetIfNeeded({ accentHex: hex })}
        />
      </div>
    </div>
  )
}
