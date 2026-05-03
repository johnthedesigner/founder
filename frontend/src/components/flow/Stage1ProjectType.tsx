import type { ProjectType, ComponentCategory } from '@ds-gen/types'
import { useConfigStore } from '../../store/configStore'

const SCOPE_DEFAULTS: Record<ProjectType, ComponentCategory[]> = {
  saas: ['forms', 'navigation', 'overlays', 'feedback', 'data-display', 'layout'],
  marketing: ['forms', 'navigation', 'feedback', 'layout'],
  mobile: ['forms', 'navigation', 'feedback', 'layout'],
}

const PROJECT_TYPES: { value: ProjectType; label: string; description: string }[] = [
  {
    value: 'saas',
    label: 'SaaS / Web App',
    description: 'Full component suite — forms, navigation, overlays, data display, and more.',
  },
  {
    value: 'marketing',
    label: 'Marketing Site',
    description: 'Focused set for landing pages, content sites, and campaigns.',
  },
  {
    value: 'mobile',
    label: 'Mobile App',
    description: 'Touch-optimized components for React Native or mobile web.',
  },
]

const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  forms: 'Forms',
  navigation: 'Navigation',
  overlays: 'Overlays',
  feedback: 'Feedback',
  'data-display': 'Data Display',
  layout: 'Layout',
}

const ALL_CATEGORIES: ComponentCategory[] = [
  'forms', 'navigation', 'overlays', 'feedback', 'data-display', 'layout',
]

export function Stage1ProjectType() {
  const projectType = useConfigStore((s) => s.config.projectType)
  const componentScope = useConfigStore((s) => s.config.componentScope)
  const setConfig = useConfigStore((s) => s.setConfig)

  function selectType(type: ProjectType) {
    setConfig({ projectType: type, componentScope: SCOPE_DEFAULTS[type] })
  }

  function toggleCategory(cat: ComponentCategory) {
    const current = componentScope
    if (current.includes(cat)) {
      if (current.length === 1) return // must keep at least 1
      setConfig({ componentScope: current.filter((c) => c !== cat) })
    } else {
      setConfig({ componentScope: [...current, cat] })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Project type</h3>
        <div className="space-y-2">
          {PROJECT_TYPES.map((pt) => (
            <button
              key={pt.value}
              onClick={() => selectType(pt.value)}
              className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                projectType === pt.value
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="text-sm font-medium text-gray-900">{pt.label}</div>
              <div className="mt-0.5 text-xs text-gray-500">{pt.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Component scope</h3>
          <details className="relative">
            <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-700 list-none select-none">
              Customize
            </summary>
            <div className="absolute right-0 z-10 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
              <p className="mb-2 text-xs text-gray-500">Toggle components to include:</p>
              <div className="space-y-1.5">
                {ALL_CATEGORIES.map((cat) => (
                  <label key={cat} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={componentScope.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                      disabled={componentScope.includes(cat) && componentScope.length === 1}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-xs text-gray-700">{CATEGORY_LABELS[cat]}</span>
                  </label>
                ))}
              </div>
            </div>
          </details>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {componentScope.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-100"
            >
              {CATEGORY_LABELS[cat]}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
