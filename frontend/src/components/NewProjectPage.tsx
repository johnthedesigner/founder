import { useEffect } from 'react'
import { useUIStore } from '../store/uiStore'
import { SystemPreview } from './preview/SystemPreview'
import { Stage1 } from './flow/Stage1'
import { Stage2 } from './flow/Stage2'
import { Stage3 } from './flow/Stage3'
import { Stage4 } from './flow/Stage4'

const STAGES = [
  { label: 'Foundation' },
  { label: 'Style' },
  { label: 'Review' },
  { label: 'Export' },
] as const

const STAGE_COMPONENTS = [Stage1, Stage2, Stage3, Stage4] as const

export function NewProjectPage() {
  const currentStage = useUIStore((s) => s.currentStage)
  const advance = useUIStore((s) => s.advance)
  const goBack = useUIStore((s) => s.goBack)
  const canAdvance = useUIStore((s) => s.canAdvance)
  const setCanAdvance = useUIStore((s) => s.setCanAdvance)

  // Stages 1, 2, and 4 always allow advancing
  useEffect(() => {
    if (currentStage !== 2) setCanAdvance(true)
  }, [currentStage, setCanAdvance])

  const StageComponent = STAGE_COMPONENTS[currentStage]
  const isFinalStage = currentStage === 3

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center border-b border-gray-200 bg-white px-6">
        <span className="text-sm font-semibold text-gray-900">Design System Generator</span>
      </header>

      {/* Stage progress */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-3">
        <nav className="flex gap-1" aria-label="Progress">
          {STAGES.map((stage, i) => {
            const isActive = i === currentStage
            const isDone = i < currentStage
            return (
              <div key={stage.label} className="flex items-center">
                {i > 0 && (
                  <div className={`mx-2 h-px w-8 ${isDone ? 'bg-blue-500' : 'bg-gray-200'}`} />
                )}
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isDone
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isDone ? '✓' : i + 1}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      isActive ? 'text-gray-900' : isDone ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
              </div>
            )
          })}
        </nav>
      </div>

      {/* Main two-column body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: stage content */}
        <div className="flex w-[480px] shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white">
          <div className="flex-1 px-8 py-8">
            <StageComponent />
          </div>

          {/* Navigation buttons */}
          <div className="shrink-0 border-t border-gray-100 px-8 py-5 flex justify-between items-center">
            <button
              onClick={goBack}
              disabled={currentStage === 0}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
            {!isFinalStage && (
              <button
                onClick={advance}
                disabled={!canAdvance}
                className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            )}
          </div>
        </div>

        {/* Right: live preview */}
        <div className="flex flex-1 items-stretch p-6">
          <SystemPreview />
        </div>
      </div>
    </div>
  )
}
