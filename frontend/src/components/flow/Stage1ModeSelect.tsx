import type { ColorMode } from '@ds-gen/types'
import { useConfigStore } from '../../store/configStore'

type ModeOption = 'light' | 'dark' | 'both'

const MODE_OPTIONS: { value: ModeOption; label: string; description: string }[] = [
  {
    value: 'light',
    label: 'Light only',
    description: 'Single light theme — simpler token set, faster to build.',
  },
  {
    value: 'dark',
    label: 'Dark only',
    description: 'Single dark theme.',
  },
  {
    value: 'both',
    label: 'Both (light + dark)',
    description: 'Dual-mode tokens generated. CSS variables switch at prefers-color-scheme.',
  },
]

function modesToOption(modes: ColorMode[]): ModeOption {
  if (modes.includes('light') && modes.includes('dark')) return 'both'
  if (modes.includes('dark')) return 'dark'
  return 'light'
}

function optionToModes(option: ModeOption): ColorMode[] {
  if (option === 'both') return ['light', 'dark']
  return [option]
}

export function Stage1ModeSelect() {
  const modes = useConfigStore((s) => s.config.modes)
  const setConfig = useConfigStore((s) => s.setConfig)

  const currentOption = modesToOption(modes)

  function selectOption(option: ModeOption) {
    setConfig({ modes: optionToModes(option) })
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Color modes</h3>
      <div className="space-y-2">
        {MODE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => selectOption(opt.value)}
            className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
              currentOption === opt.value
                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="text-sm font-medium text-gray-900">{opt.label}</div>
            <div className="mt-0.5 text-xs text-gray-500">{opt.description}</div>
          </button>
        ))}
      </div>
      {currentOption === 'both' && (
        <p className="mt-2 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
          Dual-mode tokens will be generated — semantic colors adapt automatically between light and dark.
        </p>
      )}
    </div>
  )
}
