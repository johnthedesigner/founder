import type { FunctionalColorRole, ProjectType } from '@ds-gen/types'
import { useConfigStore } from '../../store/configStore'

const ROLE_CONFIG: Record<FunctionalColorRole, { label: string; indicatorHex: string }> = {
  error:   { label: 'Error',   indicatorHex: '#ef4444' },
  warning: { label: 'Warning', indicatorHex: '#f59e0b' },
  success: { label: 'Success', indicatorHex: '#22c55e' },
  info:    { label: 'Info',    indicatorHex: '#3b82f6' },
}

const ALL_ROLES: FunctionalColorRole[] = ['error', 'warning', 'success', 'info']

const PROJECT_TYPE_DEFAULTS: Record<ProjectType, FunctionalColorRole[]> = {
  saas:      ['error', 'warning', 'success', 'info'],
  marketing: ['error'],
  mobile:    ['error', 'warning', 'success', 'info'],
}

export function Stage1FunctionalColors() {
  const projectType = useConfigStore((s) => s.config.projectType)
  const color = useConfigStore((s) => s.config.color)
  const setColor = useConfigStore((s) => s.setColor)

  const defaults = PROJECT_TYPE_DEFAULTS[projectType]
  const activeRoles = color.functionalColors?.enabled ?? defaults

  function isActive(role: FunctionalColorRole) {
    return activeRoles.includes(role)
  }

  function toggleRole(role: FunctionalColorRole) {
    const current = color.functionalColors?.enabled ?? defaults
    const next = current.includes(role)
      ? current.filter((r) => r !== role)
      : [...current, role]
    setColor({
      functionalColors: {
        ...color.functionalColors,
        enabled: next,
      },
    })
  }

  function setOverride(role: FunctionalColorRole, hex: string) {
    setColor({
      functionalColors: {
        enabled: activeRoles,
        ...color.functionalColors,
        overrides: {
          ...color.functionalColors?.overrides,
          [role]: hex,
        },
      },
    })
  }

  function clearOverride(role: FunctionalColorRole) {
    const existing = color.functionalColors?.overrides ?? {}
    const rest = Object.fromEntries(
      Object.entries(existing).filter(([k]) => k !== role),
    ) as typeof existing
    setColor({
      functionalColors: {
        enabled: activeRoles,
        ...color.functionalColors,
        overrides: Object.keys(rest).length ? rest : undefined,
      },
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Status colors</h3>
        <details className="relative">
          <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-700 list-none select-none">
            Customize
          </summary>
          <div className="absolute right-0 z-10 mt-1 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
            <p className="mb-2 text-xs text-gray-500">Enable roles and optionally override colors:</p>
            <div className="space-y-3">
              {ALL_ROLES.map((role) => {
                const { label, indicatorHex } = ROLE_CONFIG[role]
                const active = isActive(role)
                const override = color.functionalColors?.overrides?.[role]

                return (
                  <div key={role} className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleRole(role)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                      />
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: override ?? indicatorHex }}
                        aria-hidden
                      />
                      <span className="text-xs text-gray-700">{label}</span>
                    </label>
                    {active && (
                      <div className="ml-5 flex items-center gap-2">
                        <label className="relative cursor-pointer">
                          <input
                            type="color"
                            value={override ?? indicatorHex}
                            onChange={(e) => setOverride(role, e.target.value)}
                            className="sr-only"
                          />
                          <span
                            className="block h-6 w-6 rounded border border-gray-300 cursor-pointer"
                            style={{ backgroundColor: override ?? indicatorHex }}
                            aria-label={`${label} override color`}
                          />
                        </label>
                        <span className="text-xs font-mono text-gray-500">
                          {override ? override : 'derived from palette'}
                        </span>
                        {override && (
                          <button
                            onClick={() => clearOverride(role)}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            reset
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </details>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ALL_ROLES.map((role) => {
          const { label, indicatorHex } = ROLE_CONFIG[role]
          const active = isActive(role)
          const override = color.functionalColors?.overrides?.[role]

          return (
            <span
              key={role}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                active
                  ? 'bg-gray-50 text-gray-700 border-gray-200'
                  : 'bg-gray-50 text-gray-400 border-gray-100'
              }`}
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${!active ? 'opacity-30' : ''}`}
                style={{ backgroundColor: override ?? indicatorHex }}
                aria-hidden
              />
              {label}
              {!active && <span className="text-gray-300">·</span>}
              {!active && <span>off</span>}
            </span>
          )
        })}
      </div>
    </div>
  )
}
