import { useEffect } from 'react'
import { useUIStore } from '../../store/uiStore'
import { Stage3ProjectName } from './Stage3ProjectName'
import { Stage3TokenSummary } from './Stage3TokenSummary'

export function Stage3() {
  const projectName = useUIStore((s) => s.projectName)
  const setCanAdvance = useUIStore((s) => s.setCanAdvance)
  const setStage = useUIStore((s) => s.setStage)

  // Initialize canAdvance based on current name; restore on unmount
  useEffect(() => {
    setCanAdvance(projectName.trim().length > 0)
    return () => setCanAdvance(true)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Review</h2>
        <p className="mt-1 text-sm text-gray-500">
          Name your design system and review the generated tokens.
        </p>
      </div>

      <Stage3ProjectName />

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Token summary</h3>
        <Stage3TokenSummary />
      </div>

      <div className="flex gap-4 text-xs text-gray-400">
        <span>Not happy with your choices?</span>
        <button
          onClick={() => setStage(0)}
          className="text-blue-600 hover:text-blue-700 hover:underline"
        >
          Back to Foundation
        </button>
        <button
          onClick={() => setStage(1)}
          className="text-blue-600 hover:text-blue-700 hover:underline"
        >
          Back to Style
        </button>
      </div>
    </div>
  )
}
